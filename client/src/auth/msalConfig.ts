import { Configuration, PopupRequest } from "@azure/msal-browser";

// MSAL configuration for Microsoft Azure AD
export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "your-client-id-here",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "your-tenant-id"}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string) => {
        console.log(message);
      },
      piiLoggingEnabled: false
    }
  }
};

// Login request configuration
export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "email", "profile"],
  prompt: "select_account",
};

// Graph API configuration
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};