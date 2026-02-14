module Tools
  class Definitions
    # Code execution tool — enables programmatic tool calling
    CODE_EXECUTION = {
      type: "code_execution_20250825",
      name: "code_execution"
    }.freeze

    # Specialist tools — only callable from code execution (programmatic tool calling)
    ANALYZE_PATHWAYS = {
      name: "analyze_pathways",
      description: "Analyze available immigration pathways for a destination country. Returns structured comparison " \
                   "of visa/permit options with difficulty, timeline, requirements, pros and cons. " \
                   "Use when the user asks about immigration routes, options, or how to move to a country. " \
                   "Returns JSON with a 'pathways' array.",
      input_schema: {
        type: "object",
        properties: {
          destination_country: {
            type: "string",
            description: "Destination country name or ISO code (e.g. 'Canada', 'CA')"
          },
          objective: {
            type: "string",
            description: "Immigration objective: work, study, permanent_residence, family_reunion, investment, etc."
          },
          profile: {
            type: "object",
            description: "Optional user profile with age, education, work_experience_years, language_scores, etc.",
            properties: {}
          }
        },
        required: %w[destination_country objective]
      },
      allowed_callers: ["code_execution_20250825"]
    }.freeze

    CHECK_ELIGIBILITY = {
      name: "check_eligibility",
      description: "Check eligibility for a specific immigration program. Calculates point-based scores " \
                   "(CRS for Canada, SkillSelect for Australia, etc.) and returns eligibility assessment. " \
                   "Use when the user asks if they qualify, their score, or eligibility for a specific program. " \
                   "Returns JSON with eligible, score, breakdown, probability, and recommendations.",
      input_schema: {
        type: "object",
        properties: {
          destination_country: {
            type: "string",
            description: "Destination country name or ISO code"
          },
          program: {
            type: "string",
            description: "Specific immigration program (e.g. 'express_entry', 'skilled_worker', 'eb2')"
          },
          profile: {
            type: "object",
            description: "User profile: age, education_level, work_experience_years, language_scores, " \
                         "has_job_offer, has_family_in_country, etc.",
            properties: {}
          }
        },
        required: %w[destination_country]
      },
      allowed_callers: ["code_execution_20250825"]
    }.freeze

    LIST_REQUIRED_DOCUMENTS = {
      name: "list_required_documents",
      description: "List all required documents for a specific immigration pathway. Includes apostille, " \
                   "translation, and validity requirements for each document. " \
                   "Use when the user asks about documents, paperwork, or what they need to prepare. " \
                   "Returns JSON with a 'documents' array including name, category, apostille_needed, " \
                   "translation_required, validity_months.",
      input_schema: {
        type: "object",
        properties: {
          destination_country: {
            type: "string",
            description: "Destination country name or ISO code"
          },
          pathway: {
            type: "string",
            description: "Immigration pathway (e.g. 'express_entry', 'student_visa', 'work_permit')"
          },
          origin_country: {
            type: "string",
            description: "Origin country for apostille/translation requirements"
          }
        },
        required: %w[destination_country pathway]
      },
      allowed_callers: ["code_execution_20250825"]
    }.freeze

    GET_PROCESSING_STATISTICS = {
      name: "get_processing_statistics",
      description: "Get processing times, fees, approval rates, and tips for a specific immigration pathway. " \
                   "Use when the user asks about timelines, costs, fees, or success rates. " \
                   "Returns JSON with processing_time_days, fees_usd, approval_rate_percent, bottlenecks, and tips.",
      input_schema: {
        type: "object",
        properties: {
          destination_country: {
            type: "string",
            description: "Destination country name or ISO code"
          },
          pathway: {
            type: "string",
            description: "Immigration pathway (e.g. 'express_entry', 'h1b', 'student_visa')"
          }
        },
        required: %w[destination_country pathway]
      },
      allowed_callers: ["code_execution_20250825"]
    }.freeze

    TOOLS = [
      CODE_EXECUTION,
      ANALYZE_PATHWAYS,
      CHECK_ELIGIBILITY,
      LIST_REQUIRED_DOCUMENTS,
      GET_PROCESSING_STATISTICS
    ].freeze
  end
end
