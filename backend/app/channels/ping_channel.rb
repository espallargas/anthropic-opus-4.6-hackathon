class PingChannel < ApplicationCable::Channel
  def subscribed
    stream_from "ping_channel"
  end

  def ping(data)
    transmit(
      type: "pong",
      client_sent_at: data["sent_at"],
      server_time: Time.current.iso8601(3)
    )
  end
end
