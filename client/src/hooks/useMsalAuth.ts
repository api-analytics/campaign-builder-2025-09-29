import { useEffect, useState } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { AccountInfo } from "@azure/msal-browser";
import { loginRequest, graphConfig } from "../auth/msalConfig";

export interface MsalUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
}

export function useMsalAuth() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [user, setUser] = useState<MsalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Development bypass - mock user when not in production
  const isDevelopmentBypass = import.meta.env.DEV && !isAuthenticated;

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      fetchUserProfile(accounts[0]);
    } else if (isDevelopmentBypass) {
      // Mock user for development bypass
      setUser({
        id: "dev-user-id",
        email: "developer@company.com",
        firstName: "Dev",
        lastName: "User",
        isAdmin: true,
      });
      setIsLoading(false);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, accounts, isDevelopmentBypass]);

  const fetchUserProfile = async (account: AccountInfo) => {
    try {
      setIsLoading(true);
      
      // Get access token for Microsoft Graph
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      });

      // Call Microsoft Graph API to get user profile
      const graphResponse = await fetch(graphConfig.graphMeEndpoint, {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      if (graphResponse.ok) {
        const profileData = await graphResponse.json();
        
        const msalUser: MsalUser = {
          id: account.homeAccountId,
          email: profileData.mail || profileData.userPrincipalName,
          firstName: profileData.givenName,
          lastName: profileData.surname,
          profileImageUrl: `https://graph.microsoft.com/v1.0/me/photo/$value`,
          isAdmin: false, // Will be determined by your backend logic
        };

        setUser(msalUser);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser({
        id: account.homeAccountId,
        email: account.username,
        firstName: account.name?.split(" ")[0],
        lastName: account.name?.split(" ").slice(1).join(" "),
        isAdmin: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    instance.loginPopup(loginRequest).catch((error) => {
      console.error("Login error:", error);
    });
  };

  const logout = () => {
    instance.logoutPopup().catch((error) => {
      console.error("Logout error:", error);
    });
  };

  return {
    user,
    isLoading,
    isAuthenticated: isAuthenticated || isDevelopmentBypass,
    login,
    logout,
  };
}