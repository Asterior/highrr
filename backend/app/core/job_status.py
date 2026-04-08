from datetime import datetime


def normalize_job_status(is_active: bool) -> str:
    return "Active" if is_active else "Inactive"


def deadline_has_passed(application_deadline: datetime | None, now: datetime | None = None) -> bool:
    if application_deadline is None:
        return False
    return application_deadline <= (now or datetime.utcnow())


def can_accept_applications(is_active: bool, application_deadline: datetime | None, now: datetime | None = None) -> bool:
    return is_active and not deadline_has_passed(application_deadline, now)


def recruiter_job_status(
    *,
    is_active: bool,
    application_deadline: datetime | None,
    application_count: int,
    has_pending_applications: bool,
    now: datetime | None = None,
) -> str:
    deadline_passed = deadline_has_passed(application_deadline, now)

    if not is_active:
        return "Inactive"

    if deadline_passed and application_count == 0:
        return "Inactive"

    if deadline_passed and has_pending_applications:
        return "Deadline Passed"

    if deadline_passed:
        return "Inactive"

    return "Active"


def candidate_job_status(
    *,
    is_active: bool,
    application_deadline: datetime | None,
    has_applied: bool,
    now: datetime | None = None,
) -> str:
    if has_applied:
        return "Applied"

    if not can_accept_applications(is_active, application_deadline, now):
        return "Inactive"

    return "Active"


def applications_label(application_count: int) -> str:
    if application_count <= 0:
        return "No applications received"
    if application_count == 1:
        return "1 application"
    return f"{application_count} applications"
