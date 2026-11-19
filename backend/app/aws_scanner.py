"""Read-only AWS resource scanner used by Cost Intelligence."""

import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from dotenv import load_dotenv

from pathlib import Path
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)


def _aws_regions() -> list[str]:
    """Return unique regions to inspect for EC2/EBS resources."""
    raw = os.getenv("AWS_SCAN_REGIONS", "ap-south-1,us-east-1")
    regions = [item.strip() for item in raw.split(",") if item.strip()]
    return list(dict.fromkeys(regions)) or ["ap-south-1", "us-east-1"]


_REGION_LABELS = {
    "ap-south-1": "Mumbai",
    "us-east-1": "Virginia",
}


def _ec2_client(region: str | None = None):
    """Use boto3's standard credential chain (env, profile, instance role)."""
    default_region = os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION") or "ap-south-1"
    profile = os.getenv("AWS_PROFILE")
    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    return session.client("ec2", region_name=region or default_region)


def scan_ec2_instances(region: str | None = None) -> list[dict]:
    client = _ec2_client(region)
    actual_region = region or os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION") or "ap-south-1"
    findings: list[dict] = []
    paginator = client.get_paginator("describe_instances")
    for page in paginator.paginate():
        for reservation in page.get("Reservations", []):
            for instance in reservation.get("Instances", []):
                state = instance.get("State", {}).get("Name", "unknown")
                if state == "running":
                    findings.append({
                        "resource_name": instance.get("InstanceId", "unknown"),
                        "resource_type": instance.get("InstanceType", "unknown"),
                        "status": state,
                        "region": actual_region,
                        "region_name": _REGION_LABELS.get(actual_region, actual_region),
                        "recommendation": (
                            "Instance is running. Review utilization and billing before deciding whether to resize or stop it."
                        ),
                    })
    return findings


def scan_unused_ebs_volumes(region: str | None = None) -> list[dict]:
    client = _ec2_client(region)
    actual_region = region or os.getenv("AWS_DEFAULT_REGION") or os.getenv("AWS_REGION") or "ap-south-1"
    findings: list[dict] = []
    paginator = client.get_paginator("describe_volumes")
    for page in paginator.paginate():
        for volume in page.get("Volumes", []):
            if volume.get("State") == "available":
                findings.append({
                    "resource_name": volume.get("VolumeId", "unknown"),
                    "resource_type": f"{volume.get('Size', 0)}GB EBS Volume",
                    "status": "unattached",
                    "region": actual_region,
                    "region_name": _REGION_LABELS.get(actual_region, actual_region),
                    "recommendation": (
                        "This volume is unattached. Check snapshots and retention requirements before deleting it."
                    ),
                })
    return findings


def run_full_scan() -> dict:
    """Scan read-only EC2/EBS inventory in the configured regional set."""
    result = {
        "regions_scanned": _aws_regions(),
        "ec2_findings": [],
        "ebs_findings": [],
        "errors": [],
    }
    profile = os.getenv("AWS_PROFILE")
    session = boto3.Session(profile_name=profile) if profile else boto3.Session()
    if session.get_credentials() is None:
        result["errors"].append(
            "AWS credentials are not configured. Set AWS_PROFILE or use the standard AWS credential chain."
        )
        return result

    for region in result["regions_scanned"]:
        try:
            result["ec2_findings"].extend(scan_ec2_instances(region))
        except NoCredentialsError:
            result["errors"].append(f"EC2 scan in {region}: AWS credentials are unavailable.")
        except (ClientError, BotoCoreError) as exc:
            result["errors"].append(f"EC2 scan in {region} failed: {type(exc).__name__}")
        except Exception as exc:
            result["errors"].append(f"EC2 scan in {region} failed: {type(exc).__name__}")

        try:
            result["ebs_findings"].extend(scan_unused_ebs_volumes(region))
        except NoCredentialsError:
            result["errors"].append(f"EBS scan in {region}: AWS credentials are unavailable.")
        except (ClientError, BotoCoreError) as exc:
            result["errors"].append(f"EBS scan in {region} failed: {type(exc).__name__}")
        except Exception as exc:
            result["errors"].append(f"EBS scan in {region} failed: {type(exc).__name__}")

    return result

# Cost Explorer billing integration. This is separate from the EC2/EBS inventory scan.
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from copy import deepcopy

_COST_EXPLORER_CACHE: dict = {"expires_at": None, "data": None}
_COST_CACHE_TTL_SECONDS = int(os.getenv("AWS_COST_CACHE_TTL_SECONDS", "900"))


def _month_offset(value: date, offset: int) -> date:
    """Return the first day of the month offset from value's month."""
    month_index = value.year * 12 + (value.month - 1) + offset
    year, month_zero_based = divmod(month_index, 12)
    return date(year, month_zero_based + 1, 1)


def _decimal_amount(value: object) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _money(amount: Decimal, unit: str) -> dict:
    return {"amount": str(amount.quantize(Decimal("0.000001"))), "unit": unit}


def _cost_explorer_error_message(error: Exception) -> str:
    if isinstance(error, NoCredentialsError):
        return "AWS credentials are not available to the backend. Check the existing backend/.env or AWS profile."
    if isinstance(error, ClientError):
        code = error.response.get("Error", {}).get("Code", "AWSClientError")
        if code in {"AccessDenied", "AccessDeniedException", "UnauthorizedException"}:
            return "AWS denied Cost Explorer access. Grant ce:GetCostAndUsage to the IAM identity used by the backend."
        if code in {"DataUnavailableException", "BillExpirationException"}:
            return "AWS Cost Explorer data is not ready yet. Enable Cost Explorer in the AWS Billing console and allow time for billing data to populate."
        if code in {"InvalidParameterValue", "ValidationException"}:
            return f"AWS Cost Explorer rejected the request ({code}). Check the billing account's Cost Explorer availability."
        return f"AWS Cost Explorer request failed ({code}). Check the IAM policy and AWS account billing settings."
    if isinstance(error, BotoCoreError):
        return f"Could not reach AWS Cost Explorer ({type(error).__name__}). Check network access from the backend."
    return f"AWS Cost Explorer failed ({type(error).__name__})."


def get_cost_explorer_report(force_refresh: bool = False) -> dict:
    """Fetch actual AWS account costs for the last six months, grouped by service.

    One Cost Explorer query is made per cache refresh (plus any AWS pagination
    requests). Cost Explorer API requests are billable, so the result is cached.
    """
    now = datetime.now(timezone.utc)
    if (
        not force_refresh
        and _COST_EXPLORER_CACHE.get("data") is not None
        and _COST_EXPLORER_CACHE.get("expires_at") is not None
        and now < _COST_EXPLORER_CACHE["expires_at"]
    ):
        cached = deepcopy(_COST_EXPLORER_CACHE["data"])
        cached["cached"] = True
        return cached

    try:
        profile = os.getenv("AWS_PROFILE")
        session = boto3.Session(profile_name=profile) if profile else boto3.Session()
        if session.get_credentials() is None:
            raise NoCredentialsError()

        # Cost Explorer's API endpoint is in us-east-1, regardless of the
        # workload regions being analyzed (for example, ap-south-1/us-east-1).
        client = session.client("ce", region_name="us-east-1")
        today = now.date()
        current_start = today.replace(day=1)
        start = _month_offset(current_start, -5)
        end = _month_offset(current_start, 1)  # End is exclusive.

        request = {
            "TimePeriod": {"Start": start.isoformat(), "End": end.isoformat()},
            "Granularity": "MONTHLY",
            "Metrics": ["UnblendedCost"],
            "GroupBy": [{"Type": "DIMENSION", "Key": "SERVICE"}],
        }

        totals: dict[str, Decimal] = {}
        currencies: dict[str, str] = {}
        service_totals_by_month: dict[str, dict[str, Decimal]] = {}
        page_count = 0
        next_token = None

        while True:
            if next_token:
                request["NextPageToken"] = next_token
            response = client.get_cost_and_usage(**request)
            page_count += 1

            for period in response.get("ResultsByTime", []):
                month_key = period.get("TimePeriod", {}).get("Start", "")[:7]
                total_metric = period.get("Total", {}).get("UnblendedCost", {})
                if month_key and total_metric:
                    totals[month_key] = _decimal_amount(total_metric.get("Amount"))
                    currencies[month_key] = total_metric.get("Unit", "USD")

                for group in period.get("Groups", []):
                    keys = group.get("Keys", [])
                    service_name = keys[0] if keys else "Other / unclassified"
                    metric = group.get("Metrics", {}).get("UnblendedCost", {})
                    amount = _decimal_amount(metric.get("Amount"))
                    month_services = service_totals_by_month.setdefault(month_key, {})
                    month_services[service_name] = month_services.get(service_name, Decimal("0")) + amount

            next_token = response.get("NextPageToken")
            if not next_token:
                break
            request["NextPageToken"] = next_token

        unit = next(iter(currencies.values()), "USD")
        month_keys = [_month_offset(current_start, offset).strftime("%Y-%m") for offset in range(-5, 1)]
        trend = []
        for month_key in month_keys:
            amount = totals.get(month_key, Decimal("0"))
            month_date = date.fromisoformat(month_key + "-01")
            trend.append({
                "month": month_key,
                "label": month_date.strftime("%b %Y"),
                **_money(amount, currencies.get(month_key, unit)),
            })

        previous_month = month_keys[-2] if len(month_keys) > 1 else ""
        current_month = month_keys[-1]
        current_month_amount = totals.get(current_month, Decimal("0"))
        previous_month_amount = totals.get(previous_month, Decimal("0"))

        current_services = service_totals_by_month.get(current_month, {})
        service_breakdown = [
            {"service": name, **_money(amount, currencies.get(current_month, unit))}
            for name, amount in sorted(current_services.items(), key=lambda item: item[1], reverse=True)
            if amount != 0
        ]

        result = {
            "status": "connected",
            "source": "AWS Cost Explorer",
            "metric": "UnblendedCost",
            "currency": unit,
            "current_month": {
                "month": current_month,
                "label": date.fromisoformat(current_month + "-01").strftime("%B %Y"),
                **_money(current_month_amount, currencies.get(current_month, unit)),
            },
            "previous_month": {
                "month": previous_month,
                "label": date.fromisoformat(previous_month + "-01").strftime("%B %Y"),
                **_money(previous_month_amount, currencies.get(previous_month, unit)),
            },
            "monthly_trend": trend,
            "service_breakdown": service_breakdown[:12],
            "period": {"start": start.isoformat(), "end_exclusive": end.isoformat()},
            "request_count": page_count,
            "fetched_at": now.isoformat(),
            "cached": False,
            "note": "Cost Explorer data is refreshed by AWS at least daily and can lag usage by about 24 hours or longer. Amounts are in the billing currency returned by AWS.",
        }
        _COST_EXPLORER_CACHE["data"] = deepcopy(result)
        _COST_EXPLORER_CACHE["expires_at"] = now + timedelta(seconds=_COST_CACHE_TTL_SECONDS)
        return result

    except (NoCredentialsError, ClientError, BotoCoreError) as exc:
        return {
            "status": "error",
            "source": "AWS Cost Explorer",
            "message": _cost_explorer_error_message(exc),
            "error_type": type(exc).__name__,
            "fetched_at": now.isoformat(),
        }
    except Exception as exc:
        return {
            "status": "error",
            "source": "AWS Cost Explorer",
            "message": _cost_explorer_error_message(exc),
            "error_type": type(exc).__name__,
            "fetched_at": now.isoformat(),
        }
