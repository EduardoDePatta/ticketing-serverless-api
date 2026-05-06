export const ROLES = ["ORGANIZER", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: Role;
    createdAt: string;
    updatedAt: string;
}
export interface PublicUser {
    id: string;
    email: string;
    name: string;
    role: Role;
    createdAt: string;
    updatedAt: string;
}
export function toPublicUser(user: User): PublicUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
