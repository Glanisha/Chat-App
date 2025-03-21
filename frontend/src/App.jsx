import React, { useState } from "react";
import { SocketProvider } from "./contexts/SocketContext";
import Login from "./components/Login";
import Chat from "./components/Chat";

const App = () => {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  return (
    <SocketProvider>
      <div>
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Chat userId={user.userId} username={user.username} />
        )}
      </div>
    </SocketProvider>
  );
};

export default App;