class ExtractionChannel < ApplicationCable::Channel
  def subscribed
    stream_from "extraction_progress"
  end
end
