# Force load schemas early to avoid uninitialized constant errors
require_relative '../app/lib/sse_message_schema'
