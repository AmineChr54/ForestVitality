import { SecurityService } from "./application/SecurityService";

const securityService = new SecurityService();

export const SecurityAPI = {
  login: () => securityService.login(),
  logout: () => securityService.logout(),
  handleCallback: (code: string) => securityService.handleCallback(code),
  getAuthState: () => securityService.getAuthState(),
};

export default SecurityAPI;