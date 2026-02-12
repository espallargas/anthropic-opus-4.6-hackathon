class PingChannel < ApplicationCable::Channel
  def subscribed
    stream_from "ping_channel"
  end

  def ping(data)
    ActionCable.server.broadcast(
      "ping_channel",
      {
        pong: true,
        client_sent_at: data["sent_at"],
        server_time: Time.current.iso8601(3)
      }
    )
  end
end
