import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import "./index.css";
import AppErrorBoundary from "./components/common/AppErrorBoundary.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { FeedbackProvider } from "./context/FeedbackContext.jsx";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <FeedbackProvider>
            <AuthProvider>
              <CartProvider>
                <AppErrorBoundary><App /></AppErrorBoundary>
              </CartProvider>
            </AuthProvider>
          </FeedbackProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
