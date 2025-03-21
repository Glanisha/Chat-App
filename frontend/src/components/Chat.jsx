import { useEffect, useState } from "react";
import { useSocket } from "../contexts/SocketContext";

const Chat = ({ userId, username }) => {
  const socket = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [receiverUsername, setReceiverUsername] = useState(""); // Username of the user to chat with

  useEffect(() => {
    // Notify the server that this user is online
    socket.emit("login", userId);

    // Listen for incoming private messages
    socket.on("privateMessage", ({ senderId, message }) => {
      setMessages((prev) => [...prev, { senderId, message }]);
    });

    // Cleanup on unmount
    return () => {
      socket.off("privateMessage");
    };
  }, [socket, userId]);

  const sendMessage = () => {
    if (message.trim() && receiverUsername) {
      // Send the message to the server
      socket.emit("privateMessage", { senderId: userId, receiverUsername, message });

      // Display the sent message immediately
      setMessages((prev) => [...prev, { senderId: userId, message }]);
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 className="text-2xl font-bold mb-6 text-blue-400">Chat as {username}</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            Chat with Username:
          </label>
          <input
            type="text"
            value={receiverUsername}
            onChange={(e) => setReceiverUsername(e.target.value)}
            placeholder="Enter receiver's username"
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
          />
        </div>

        <div className="mb-6 h-96 overflow-y-auto bg-gray-700 rounded-lg p-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-4 ${
                msg.senderId === userId ? "text-right" : "text-left"
              }`}
            >
              <span
                className={`inline-block px-4 py-2 rounded-lg ${
                  msg.senderId === userId
                    ? "bg-blue-600 text-white"
                    : msg.senderId === "AI" // Highlight AI messages differently
                    ? "bg-green-600 text-white"
                    : "bg-gray-600 text-white"
                }`}
              >
                <strong>
                  {msg.senderId === userId
                    ? "You"
                    : msg.senderId === "AI"
                    ? "AI"
                    : msg.senderId}
                </strong>: {msg.message}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
          />
          <button
            onClick={sendMessage}
            className="px-6 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;