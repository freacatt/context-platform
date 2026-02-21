"""Server-side prompt templates for AI recommendations.

All prompt logic lives here — the frontend sends structured variables only.
"""

TEMPLATES: dict[str, str] = {
    # ── Pyramid Solver ──────────────────────────────────────────────────
    "pyramid_combined_question": """You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

PYRAMID CONTEXT:
{pyramid_context}

GLOBAL PROJECT CONTEXT:
{global_context}

HISTORY OF THOUGHT:
{history_context}

CURRENT SITUATION:
We are at a combined block where multiple parent questions merge.

PARENT QUESTIONS:
{parent_questions}

TASK:
Suggest 3 short, insightful combined questions that bridge the parent questions and move the solution forward.
Return ONLY the 3 questions, each on its own line.""",

    "pyramid_answer": """You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

PYRAMID CONTEXT:
{pyramid_context}

GLOBAL PROJECT CONTEXT:
{global_context}

HISTORY OF THOUGHT:
{history_context}

CURRENT QUESTION:
{question}

TASK:
Suggest 3 short, distinct answers that could move the solution forward.
Return ONLY the 3 answers, each on its own line.""",

    "pyramid_followup_question": """You are an expert brainstorming assistant helping to solve a complex problem using a pyramid structure.

PYRAMID CONTEXT:
{pyramid_context}

GLOBAL PROJECT CONTEXT:
{global_context}

HISTORY OF THOUGHT:
{history_context}

CURRENT ANSWER:
{answer}

PARENT QUESTION:
{parent_question}

TASK:
Suggest 3 short follow-up questions that dig deeper into this answer and advance the solution.
Return ONLY the 3 questions, each on its own line.""",

    # ── Product Definition ──────────────────────────────────────────────
    "product_definition_topic": """You are an expert product manager assistant helping to define a product using a structured methodology.

PRODUCT TITLE:
{product_title}

TOPIC:
{topic_label}

CURRENT DESCRIPTION:
{current_description}

CONTEXT INFORMATION:
{context_data}

GLOBAL PROJECT CONTEXT:
{global_context}

TASK:
Suggest a clear, practical description for this product definition topic.
- Focus on user value and behavior.
- Mention constraints or assumptions when relevant.
Return ONLY the description text.""",

    # ── Technical Task ──────────────────────────────────────────────────
    "technical_task_field": """You are an experienced software engineer helping to refine a technical task.

TASK TITLE:
{task_title}

TASK DESCRIPTION:
{task_description}

FIELD TO GENERATE:
{field_label} ({field_name})

CURRENT VALUE:
{current_value}

GLOBAL PROJECT CONTEXT:
{global_context}

TASK:
Suggest a high-quality value for this field ({ai_context}).
- Keep the format appropriate for how this field is displayed in the UI.
- Be concise but specific and implementation-focused.
Return ONLY the suggested field content.""",

    # ── Technical Architecture ──────────────────────────────────────────
    "technical_architecture_field": """You are an expert software architect assistant.

ARCHITECTURE TITLE:
{architecture_title}

FIELD TITLE:
{field_title}

FIELD PATH:
{field_path}

DESCRIPTION / CONTEXT:
{description}

GLOBAL PROJECT CONTEXT:
{global_context}

CURRENT VALUE:
{current_value}

TASK:
Suggest a professional, detailed value for this field.
- If the field expects a list, provide newline-separated items.
- If it expects a map, provide "Key: Value" lines.
- Otherwise, provide 2–4 sentences describing the decision.
Return ONLY the content to insert, without additional commentary.""",

    # ── Diagram ─────────────────────────────────────────────────────────
    "diagram_block_description": """You are an expert system architect and visual thinker helping to describe a diagram block.

DIAGRAM TITLE:
{diagram_title}

BLOCK TITLE:
{block_title}

GLOBAL PROJECT CONTEXT:
{global_context}

ATTACHED CONTEXT SOURCES:
{context_summary}

CONNECTIONS:
{connections_summary}

CURRENT DESCRIPTION:
{current_description}

TASK:
Write a concise, clear description (2–3 sentences) for this block that explains what it represents and how it fits in the diagram.
Return ONLY the description text, without bullet points or surrounding quotes.""",

    # ── UI/UX Architecture ──────────────────────────────────────────────
    "uiux_page_description": """You are a senior UI/UX designer documenting an application page.

ARCHITECTURE:
UI/UX Architecture

PAGE TITLE:
{page_title}

ROUTE:
{route}

REQUIRES AUTH:
{requires_auth}

GLOBAL PROJECT CONTEXT:
{global_context}

TASK:
Write a concise description of this page's purpose and primary user flows.
- 2–4 sentences.
Return ONLY the description text.""",

    "uiux_theme_description": """You are a senior UI/UX designer optimizing a design system theme.

ARCHITECTURE:
UI/UX Architecture

SUBJECT NAME:
Global Theme

CURRENT CONTEXT:
Font Family: {font_family}
Base Size: {font_size_base}

GLOBAL PROJECT CONTEXT:
{global_context}

TASK:
Suggest a concise, high-level description for this theme.
- Focus on look and feel, typography, and overall personality.
- 2–4 sentences max.
Return ONLY the description text.""",

    "uiux_component_description": """You are a senior UI/UX designer documenting a design system component.

ARCHITECTURE:
UI/UX Architecture

COMPONENT NAME:
{component_name}

CATEGORY:
{category}

TYPE:
{component_type}

GLOBAL PROJECT CONTEXT:
{global_context}

TASK:
Write a concise description of this component's purpose and usage.
- Focus on how and when it should be used.
- 2–4 sentences.
Return ONLY the description text.""",
}


def render_prompt(prompt_type: str, variables: dict[str, str]) -> str:
    """Render a prompt template with the given variables.

    Missing variables are replaced with empty strings.
    Raises ValueError for unknown prompt_type.
    """
    template = TEMPLATES.get(prompt_type)
    if template is None:
        raise ValueError(f"Unknown prompt type: {prompt_type}")

    class DefaultDict(dict):
        def __missing__(self, key: str) -> str:
            return ""

    return template.format_map(DefaultDict(variables))


def list_prompt_types() -> list[str]:
    """Return all registered prompt type names."""
    return list(TEMPLATES.keys())
