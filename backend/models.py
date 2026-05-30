from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class UnitInput(BaseModel):
    grade: str
    subject: str
    chapter: str
    context: str = "general"  # optional — defaults to general examples


class StudentSession(BaseModel):
    session_id: str
    unit_input: UnitInput
    current_template: str
    performance: Dict[str, Any] = {}
    completed_templates: List[str] = []


class AnswerInput(BaseModel):
    session_id: str
    question: str
    correct_answer: str
    student_answer: str
    subtopic: str
    dimension: str
    level: str


class ProjectMessage(BaseModel):
    session_id: str
    project_idea: str
    message: str
    progress: str = ""
