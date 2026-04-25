"""
Email service via Resend (free tier: 3,000 emails/month).
Fails silently — email is never a blocker for core functionality.
"""
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


async def _send(to: str, subject: str, html: str) -> bool:
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return False
    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": to,
            "subject": subject,
            "html": html,
        })
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


async def send_task_assigned(to: str, assignee_name: str, task_title: str, project_name: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#5B6CFF">You've been assigned a task</h2>
      <p>Hi {assignee_name},</p>
      <p>You have been assigned: <strong>{task_title}</strong> in project <strong>{project_name}</strong>.</p>
      <p>Log in to Allocra to view details and update your progress.</p>
      <hr/>
      <small style="color:#94A3B8">Allocra · Decision Intelligence for Teams</small>
    </div>
    """
    return await _send(to, f"Task Assigned: {task_title}", html)


async def send_allocation_summary(
    to: str,
    creator_name: str,
    project_name: str,
    assigned: int,
    unassigned: int,
    avg_score: float,
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#5B6CFF">Allocation Run Complete</h2>
      <p>Hi {creator_name},</p>
      <p>An allocation was just run in <strong>{project_name}</strong>:</p>
      <ul>
        <li>✅ Assigned: {assigned} tasks</li>
        <li>⚠️ Unassigned: {unassigned} tasks</li>
        <li>📊 Avg Score: {avg_score:.1f}/100</li>
      </ul>
      <p>Log in to Allocra to review results.</p>
      <hr/>
      <small style="color:#94A3B8">Allocra · Decision Intelligence for Teams</small>
    </div>
    """
    return await _send(to, f"Allocation Complete — {project_name}", html)


async def send_risk_alert(to: str, name: str, task_title: str, risk_reasons: list) -> bool:
    reasons_html = "".join(f"<li>{r}</li>" for r in risk_reasons)
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#EF4444">⚠️ High Risk Assignment Detected</h2>
      <p>Hi {name},</p>
      <p>Task <strong>{task_title}</strong> was assigned with HIGH risk:</p>
      <ul>{reasons_html}</ul>
      <p>Consider reviewing this assignment in Allocra.</p>
      <hr/>
      <small style="color:#94A3B8">Allocra · Decision Intelligence for Teams</small>
    </div>
    """
    return await _send(to, f"Risk Alert: {task_title}", html)
