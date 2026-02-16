// security/domain/model/User.ts

export interface User {
  id: string;
  email?: string;
  name?: string;
  roles: string[]; // Array of roles from Keycloak
}
