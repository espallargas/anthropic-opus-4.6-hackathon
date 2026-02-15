# i18n Translation Glossary

This document describes every i18n key used in the FreePath application, grouped by UI section. Use it as a reference when adding or updating translations.

---

## App & Navigation

| Key | English | Context |
|-----|---------|---------|
| `app.title` | FreePath | Application name displayed in the browser tab and header. Should not be translated. |
| `nav.chat` | Chat | Navigation tab label that switches to the main chat view |
| `nav.admin` | Admin | Navigation tab label that switches to the admin/legislation management view |
| `nav.logo.alt` | FreePath Logo | Alt text for the application logo image (accessibility) |
| `nav.design` | Design | Navigation tab label that switches to the design system reference page |
| `resize.tooltip` | Drag to resize | Tooltip shown when hovering over the sidebar resize handle |
| `globe.loading` | Loading globe... | Placeholder text shown while the 3D globe component is loading on the chat page |

## Sidebar

| Key | English | Context |
|-----|---------|---------|
| `sidebar.reconfigure` | Reconfigure | Button label in the sidebar to re-open the setup wizard and change user profile data |
| `sidebar.reconfigure.tooltip` | Reconfigure data | Tooltip for the reconfigure button explaining its purpose |
| `sidebar.expand` | Expand | Tooltip/label for the button that expands the collapsed sidebar |
| `sidebar.collapse` | Collapse | Tooltip/label for the button that collapses the sidebar to a narrow strip |
| `sidebar.language` | Language | Label for the language/locale picker dropdown in the sidebar |
| `sidebar.newChat` | New chat | Button label to start a fresh chat conversation |
| `sidebar.deleteChat` | Delete chat | Button label / tooltip to delete an existing chat from the sidebar list |

## Chat

| Key | English | Context |
|-----|---------|---------|
| `chat.empty` | Send a message to get started. | Placeholder text shown in the empty chat area before the user sends their first message |
| `chat.placeholder` | Type your message... | Placeholder text inside the chat input field |
| `chat.stop` | Stop (Esc) | Button label to interrupt/stop the AI response while it is streaming. Includes keyboard shortcut hint. |
| `chat.send` | Send | Button label (and tooltip) for submitting a chat message |
| `chat.processing` | Processing... | Status indicator shown while the backend is processing the user's message before streaming begins |
| `chat.interrupted` | *[response interrupted]* | Inline text appended to a message when the user stopped the AI response mid-stream. Rendered as italic markdown. |

## Greeting

| Key | English | Context |
|-----|---------|---------|
| `greeting.intro` | Hello! I understand you have the following details: | Opening line of the AI's first greeting message, introducing the user's profile summary |
| `greeting.nationalities` | Nationalities | Label for the nationalities field in the greeting profile summary |
| `greeting.origin` | Origin country | Label for the origin country field in the greeting profile summary |
| `greeting.destination` | Destination country | Label for the destination country field in the greeting profile summary |
| `greeting.objective` | Objective | Label for the immigration objective field in the greeting profile summary |
| `greeting.closing` | How can I help you today? | Closing question at the end of the AI's greeting message, inviting the user to ask a question |

## Setup Form

| Key | English | Context |
|-----|---------|---------|
| `setup.description` | Fill in your details to receive personalized guidance on your immigration process. | Introductory paragraph shown at the top of the setup wizard |
| `setup.origin` | Country of origin | Form field label for selecting origin country |
| `setup.origin.placeholder` | Select your country of origin | Placeholder text in the origin country dropdown |
| `setup.nationality` | Nationality | Form field label for entering nationality |
| `setup.nationality.placeholder` | Ex: Brazilian | Placeholder/example text in the nationality input field |
| `setup.destination` | Destination country | Form field label for selecting destination country |
| `setup.destination.placeholder` | Select your destination country | Placeholder text in the destination country dropdown |
| `setup.visa` | Visa type / objective | Form field label for the visa type or immigration objective |
| `setup.visa.placeholder` | Ex: Work, study, permanent residence | Placeholder/example text in the visa type input field |
| `setup.additional` | Additional information (optional) | Form field label for extra context; "(optional)" should be translated |
| `setup.additional.placeholder` | Additional context that may help... | Placeholder text in the additional information textarea |
| `setup.submit` | Start chat | Submit button label at the end of the setup form |
| `setup.step.origin` | Country of origin | Step title in the multi-step wizard for the origin selection step |
| `setup.step.origin.description` | Which country will you be departing from? | Helper text below the step title, guiding the user on what to select |
| `setup.step.nationalities` | Nationalities | Step title in the multi-step wizard for the nationalities step |
| `setup.step.nationalities.description` | List all your current nationalities | Helper text prompting the user to enter all nationalities they hold |
| `setup.step.destination` | Destination country | Step title in the multi-step wizard for the destination selection step |
| `setup.step.objective` | Objective | Step title in the multi-step wizard for the objective selection step |
| `setup.step.objective.description` | What is your reason for going to the destination country? | Helper text guiding the user to pick their immigration objective |
| `setup.next` | Next | Button label to advance to the next step of the wizard |
| `setup.back` | Back | Button label to return to the previous step of the wizard |
| `setup.cancel` | Cancel | Button label to close/cancel the setup wizard |
| `setup.start` | Start chat | Final button label on the last step to start the chat after setup |
| `setup.search.placeholder` | Search country... | Placeholder text in the country search/filter input within the country picker |

## Setup Objectives

| Key | English | Context |
|-----|---------|---------|
| `setup.objective.temporary_visit` | Temporary visit | Selectable option for immigration objective -- short-term travel/tourism |
| `setup.objective.education` | Education | Selectable option for immigration objective -- studying abroad |
| `setup.objective.work` | Work | Selectable option for immigration objective -- employment-based immigration |
| `setup.objective.family_reunion` | Family reunion | Selectable option for immigration objective -- joining family members abroad |
| `setup.objective.seek_protection` | Seek protection | Selectable option for immigration objective -- any form of protection (humanitarian, refugee, asylum, subsidiary protection, etc.) |
| `setup.objective.investments` | Investments | Selectable option for immigration objective -- investor visa programs |
| `setup.objective.permanent_residence` | Permanent residence | Selectable option for immigration objective -- long-term residency |
| `setup.objective.other` | Other | Selectable option for immigration objective -- freeform/custom objective |
| `setup.objective.other.placeholder` | Describe your objective... | Placeholder text in the freeform input shown when "Other" is selected |

## Chat Context Bar

| Key | English | Context |
|-----|---------|---------|
| `chat.context.nationalities` | Nationalities: | Label shown in the compact context bar above the chat, summarizing the user's nationalities |
| `chat.context.from` | From | Label prefix for the origin country in the context bar (e.g., "From Brazil") |
| `chat.context.to` | To | Label prefix for the destination country in the context bar (e.g., "To Germany") |

## Tools

| Key | English | Context |
|-----|---------|---------|
| `tool.search_visa_requirements` | Searching visa requirements | Status text shown in a tool-call card while the AI searches for visa requirements |
| `tool.check_processing_times` | Checking processing times | Status text shown in a tool-call card while the AI checks processing times |
| `tool.analyze_pathways` | Analyzing immigration pathways | Status text shown in a tool-call card while the AI analyzes immigration pathways |
| `tool.check_eligibility` | Checking eligibility | Status text shown in a tool-call card while the AI checks eligibility criteria |
| `tool.list_required_documents` | Listing required documents | Status text shown in a tool-call card while the AI lists required documents |
| `tool.get_processing_statistics` | Getting processing statistics | Status text shown in a tool-call card while the AI retrieves processing statistics |
| `tool.code_execution` | Executing code | Status text shown in a tool-call card while the AI executes code |
| `tool.get_legislation` | Fetching legislation | Status text shown in a tool-call card while the AI fetches legislation data from the database |

## Usage & Tokens

| Key | English | Context |
|-----|---------|---------|
| `usage.input` | Input | Label for the input token count in the usage badge (prompt tokens sent to the model) |
| `usage.output` | Output | Label for the output token count in the usage badge (tokens generated by the model) |
| `usage.cached` | cached | Suffix annotation indicating that tokens were served from prompt cache |
| `usage.cache_miss` | cache miss | Suffix annotation indicating that tokens were not found in prompt cache |
| `usage.label` | Tokens used | Header label for the expandable token usage section at the bottom of a message |
| `usage.tokens_short` | tok | Abbreviated unit for tokens, used in compact displays (e.g., agent cards) |

## Agents

| Key | English | Context |
|-----|---------|---------|
| `agent.analyze_pathways` | Pathway Strategist | Display name for the sub-agent that analyzes immigration pathways |
| `agent.check_eligibility` | Eligibility Analyst | Display name for the sub-agent that checks eligibility criteria |
| `agent.list_required_documents` | Documentation Specialist | Display name for the sub-agent that lists required documents |
| `agent.get_processing_statistics` | Application Manager | Display name for the sub-agent that retrieves processing statistics |
| `agent.unknown` | Agent | Fallback display name for an unrecognized agent type |
| `agent.analyzing` | Analyzing... | Status text shown inside an agent card while the agent is actively working |
| `agent.cancelled` | Cancelled | Status text shown inside an agent card when the agent's work was cancelled by the user |

## Thinking

| Key | English | Context |
|-----|---------|---------|
| `thinking.active` | Thinking... | Status indicator shown while the AI model is in its extended thinking/reasoning phase |
| `thinking.done` | Reasoning complete | Status text shown after the AI model finishes its thinking phase |

## Admin

| Key | English | Context |
|-----|---------|---------|
| `admin.header.title` | Legislation Admin | Page title displayed at the top of the admin view |
| `admin.header.description` | Manage country legislation | Subtitle/description below the admin page title |
| `admin.section.active` | Active | Tab/section label for countries that already have crawled legislation |
| `admin.section.pending` | Pending | Tab/section label for countries that have not yet been crawled |
| `admin.country_item.updated` | updated | Relative time suffix on country items (e.g., "updated 2 days ago") |
| `admin.country_item.view_legislations` | View legislations | Button label to open the legislation panel for a specific country |
| `admin.country_item.refresh_legislation` | Refresh legislation | Button label to trigger a new crawl for a country's legislation |
| `admin.units.doc` | doc | Singular unit label for document count |
| `admin.units.docs` | docs | Plural unit label for document count |
| `admin.units.tokens` | tokens | Unit label for token counts in admin displays |
| `admin.units.legislation` | legislation | Singular unit label for legislation count |
| `admin.units.legislations` | legislations | Plural unit label for legislation count |
| `admin.legislation_panel.loading` | Loading... | Loading indicator in the legislation detail panel |
| `admin.legislation_panel.empty` | No legislations | Empty state message when a country has no crawled legislations |

## Admin Crawl

| Key | English | Context |
|-----|---------|---------|
| `admin.crawl.loading` | Loading... | Loading indicator shown while the crawl panel initializes |
| `admin.crawl.error` | Error loading countries | Error message displayed when the country list fails to load |
| `admin.crawl.retry` | Retry | Button label to retry a failed data load operation |
| `admin.crawl.no_countries` | No countries available | Empty state message when no countries are configured in the system |
| `admin.crawl.pause` | Pause crawl | Button label to pause an active crawl operation |
| `admin.crawl.close` | Close | Button label to close the crawl progress panel |
| `admin.crawl.starting` | Starting crawl... | Status text shown while the crawl is initializing before the first results arrive |
| `admin.crawl.complete` | Crawl complete | Status text (with checkmark) shown when the crawl finishes successfully |
| `admin.crawl.documents_saved` | documents saved | Summary label shown after crawl completion indicating how many documents were persisted |
| `admin.crawl.stop_confirm` | Stop crawl? | Confirmation dialog title when the user attempts to stop an active crawl |
| `admin.crawl.stop_description` | Progress will be discarded. All data is only saved at the end. | Warning message in the stop confirmation dialog explaining data loss implications |
| `admin.crawl.stop_cancel` | Cancel | Button label to dismiss the stop confirmation dialog and continue the crawl |
| `admin.crawl.stop_confirm_button` | Stop & Close | Button label to confirm stopping the crawl and closing the panel |
| `admin.crawl.tokens` | tokens | Unit label for token counts displayed during crawl progress |
| `admin.crawl.parsing` | parsing | Status label shown while web results are being parsed into structured legislation data |
| `admin.crawl.found` | found | Status label indicating how many items were discovered (e.g., "3 found") |
| `admin.crawl.searching` | Searching | Status label shown while the crawler is searching the web for legislation sources |
| `admin.crawl.documents_indexed` | documents indexed | Status label indicating how many documents have been indexed during the crawl |
| `admin.crawl.more` | more | Link/button text to show additional items in a truncated list |

## Admin Categories

| Key | English | Context |
|-----|---------|---------|
| `admin.categories.title` | Categories | Section header for the legislation categories panel during crawl |
| `admin.categories.searching` | Searching... | Status text shown while the crawler is discovering categories |
| `admin.categories.results_crawled` | web results crawled | Summary metric label (e.g., "15 web results crawled") |
| `admin.categories.parsed` | legislations parsed | Summary metric label (e.g., "8 legislations parsed") |
| `admin.category.federal_laws` | Federal Laws | Category name for constitutional and primary legislation |
| `admin.category.federal_laws.description` | Constitutional & main laws | Short description of the federal laws category |
| `admin.category.regulations` | Regulations | Category name for official procedures and administrative rules |
| `admin.category.regulations.description` | Official procedures | Short description of the regulations category |
| `admin.category.consular` | Consular Rules | Category name for visa and embassy-related legislation |
| `admin.category.consular.description` | Visa & embassies | Short description of the consular rules category |
| `admin.category.jurisdictional` | Jurisdictional | Category name for regional/state-level rules |
| `admin.category.jurisdictional.description` | Regional rules | Short description of the jurisdictional category |
| `admin.category.complementary` | Health & Complementary | Category name for health requirements and supplementary regulations |
| `admin.category.complementary.description` | Health requirements | Short description of the complementary category |
| `admin.category.auxiliary` | Auxiliary | Category name for statistics, quotas, and supplemental data |
| `admin.category.auxiliary.description` | Statistics & quotas | Short description of the auxiliary category |

## Admin Thinking & Output

| Key | English | Context |
|-----|---------|---------|
| `admin.thinking.title` | Thinking | Section header for the AI thinking/reasoning panel in the crawl UI |
| `admin.thinking.waiting` | Waiting for Claude to think... | Placeholder text shown before the AI begins its thinking phase |
| `admin.thinking.tokens` | Tokens: | Label prefix for displaying the thinking token count (e.g., "Tokens: 1,234") |
| `admin.thinking.adaptive` | Adaptive | Badge label indicating the AI is using adaptive thinking effort mode |
| `admin.thinking.high_effort` | High effort | Badge label indicating the AI is using high thinking effort mode |
| `admin.output.title` | Claude Output | Section header for the AI's raw text output panel in the crawl UI |
| `admin.output.waiting` | Waiting for Claude output... | Placeholder text shown before the AI begins generating output |

## Admin Legislation

See also: **Admin** section above for `admin.legislation_panel.*` keys.

No additional keys beyond those listed in Admin above.

## Admin Extraction

| Key | English | Context |
|-----|---------|---------|
| `admin.extraction.progress` | extracted | Status label shown during the extraction phase (e.g., "5 extracted") |
| `admin.extraction.processing` | extracting... | Status label shown while an individual legislation document is being extracted |
| `admin.extraction.failed` | failed | Status label shown when extraction of a legislation document fails |

## Legislation

| Key | English | Context |
|-----|---------|---------|
| `legislation.source` | Source | Label for the source URL link on a legislation detail card |
| `legislation.deprecated` | Deprecated | Badge/tag shown on legislation items that are no longer current or have been superseded |

## Countries

Standard country names in ISO 3166-1 alpha-2 format. Keys follow the pattern `countries.{code}` where `{code}` is the two-letter country code (e.g., `countries.us` for United States, `countries.br` for Brazil). These are used throughout the application wherever country names are displayed -- in the setup wizard country picker, the admin country list, the chat context bar, and the greeting summary. Translate each country name according to the target locale's standard conventions.

## Themes

| Key | English | Context |
|-----|---------|---------|
| `theme.label` | Theme | Label for the theme picker section in the sidebar |
| `theme.mood.clean` | Clean | Mood/category label grouping themes with a clean, minimal aesthetic |
| `theme.mood.tech` | Tech | Mood/category label grouping themes with a technical/cyberpunk aesthetic |
| `theme.mood.warm` | Warm | Mood/category label grouping themes with warm, earthy tones |
| `theme.mood.bold` | Bold | Mood/category label grouping themes with vibrant, high-contrast colors |
| `theme.midnight` | Midnight | Theme name -- dark blue/navy palette. Theme names are proper nouns and may be kept as-is or translated. |
| `theme.slate` | Slate | Theme name -- neutral gray palette |
| `theme.slate_rose` | Slate Rose | Theme name -- gray palette with rose/pink accent |
| `theme.slate_emerald` | Slate Emerald | Theme name -- gray palette with emerald/green accent |
| `theme.slate_gold` | Slate Gold | Theme name -- gray palette with gold accent |
| `theme.obsidian` | Obsidian | Theme name -- deep black/dark palette |
| `theme.aurora` | Aurora | Theme name -- inspired by aurora borealis colors |
| `theme.nebula` | Nebula | Theme name -- space/purple-inspired palette |
| `theme.neon` | Neon | Theme name -- bright neon/cyberpunk palette |
| `theme.ember` | Ember | Theme name -- warm orange/red palette |
| `theme.sage` | Sage | Theme name -- muted green/earth tone palette |
| `theme.copper` | Copper | Theme name -- warm copper/bronze palette |
| `theme.cosmos` | Cosmos | Theme name -- deep space-inspired palette |
| `theme.arctic` | Arctic | Theme name -- cool blue/ice palette |
| `theme.horizon` | Horizon | Theme name -- gradient-inspired warm-to-cool palette |

## Design System

| Key | English | Context |
|-----|---------|---------|
| `design.title` | Design System | Page title for the design system reference page |
| `design.subtitle` | Visual reference of components with the active theme | Subtitle explaining that the page shows components rendered with the currently selected theme |
| `design.section.palette` | Color Palette | Section heading for the color swatch display |
| `design.section.typography` | Typography | Section heading for the typography examples |
| `design.section.buttons` | Buttons | Section heading for the button component showcase |
| `design.section.inputs` | Form Inputs | Section heading for the form input component showcase |
| `design.section.cards` | Cards | Section heading for the card component showcase |
| `design.section.status` | Status Indicators | Section heading for status indicator components (success, warning, error, info) |
| `design.section.glass` | Glass Panel | Section heading for the glassmorphism panel component |
| `design.section.expandable` | Expandable Sections | Section heading for the accordion/collapsible section component |
| `design.section.icon_buttons` | Icon Buttons | Section heading for the icon-only button component showcase |
| `design.section.section_header` | Section Header | Section heading for the section header component showcase |
| `design.section.agents` | Agent Cards | Section heading for the agent card component showcase |
| `design.section.thinking` | Thinking Cards | Section heading for the thinking/reasoning card component showcase |
| `design.section.tools` | Tool Call Cards | Section heading for the tool call card component showcase |
| `design.section.usage` | Usage Badge | Section heading for the token usage badge component showcase |
| `design.section.animations` | Animations | Section heading for the animation/motion examples |
