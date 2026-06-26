from pydantic import BaseModel, Field
from typing import Optional


class ResumeUploadResponse(BaseModel):
    session_id: str
    filename: str
    text: str
    char_count: int


class ResumeTextRequest(BaseModel):
    text: str = Field(..., min_length=50)


class SessionRequest(BaseModel):
    session_id: str


class ScoreDimension(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    feedback: str


class ScoreResult(BaseModel):
    overall: int = Field(ge=0, le=100)
    dimensions: list[ScoreDimension]
    strengths: list[str]
    weaknesses: list[str]


class OptimizeResult(BaseModel):
    optimized_text: str
    changes: list[str]


class JDMatchRequest(BaseModel):
    session_id: str
    jd_text: str = Field(..., min_length=20)


class MatchResult(BaseModel):
    match_percentage: int = Field(ge=0, le=100)
    matched_skills: list[str]
    missing_skills: list[str]
    experience_gaps: list[str]
    suggestions: list[str]


class JDOptimizeResult(BaseModel):
    optimized_text: str
    changes: list[str]
    new_match_percentage: int = Field(ge=0, le=100)


class InterviewQuestion(BaseModel):
    category: str
    question: str
    difficulty: str
    answer_strategy: str


class InterviewResult(BaseModel):
    questions: list[InterviewQuestion]


class CoverLetterRequest(BaseModel):
    session_id: str
    jd_text: str = Field(..., min_length=20)
    company_name: Optional[str] = None
    position_name: Optional[str] = None


class CoverLetterResult(BaseModel):
    cover_letter: str


class RecruitGreetingRequest(BaseModel):
    session_id: str
    jd_text: str = Field(..., min_length=20)
    company_name: Optional[str] = None
    position_name: Optional[str] = None


class RecruitGreetingResult(BaseModel):
    greeting: str


# ---- Interview Agent Models ----


class InterviewerAgent(BaseModel):
    id: str
    name: str
    title: str
    style: str
    focus_areas: list[str]
    system_prompt: str
    avatar: str = ""


class InterviewSetupRequest(BaseModel):
    session_id: str
    jd_text: str = Field(..., min_length=20)
    mode: str = Field(default="1v1", pattern="^(1v1|panel)$")
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")


class InterviewSetupResponse(BaseModel):
    interviewers: list[InterviewerAgent]


class InterviewStartRequest(BaseModel):
    session_id: str
    interviewers: list[InterviewerAgent]
    mode: str = "1v1"
    difficulty: str = "intermediate"


class InterviewMessage(BaseModel):
    role: str  # "interviewer" | "candidate" | "system"
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    content: str
    coaching_tip: Optional[str] = None


class InterviewStartResponse(BaseModel):
    interview_id: str
    first_message: InterviewMessage


class InterviewMessageRequest(BaseModel):
    interview_id: str
    session_id: str  # ownership check: must match the interview's session
    content: str


class InterviewEndRequest(BaseModel):
    interview_id: str
    session_id: str  # ownership check: must match the interview's session


class InterviewMessageResponse(BaseModel):
    reply: InterviewMessage
    coaching_tip: Optional[str] = None
    is_complete: bool = False
    next_speaker_id: Optional[str] = None


class EvalDimension(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    feedback: str


class RoundReview(BaseModel):
    question_index: int
    question: str
    answer_summary: str
    rating: str
    feedback: str


class EvaluationReport(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    dimensions: list[EvalDimension]
    strengths: list[str]
    improvements: list[str]
    round_reviews: list[RoundReview]
    summary: str


class InterviewEndResponse(BaseModel):
    interview_id: str
    report: EvaluationReport
