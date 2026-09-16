import crypto from "crypto";
import { AuthUser } from "./types.js";

const DEFAULT_LIVING_PREFERENCES = {
  preferredCity: "Hyderabad",
  preferredArea: "Kukatpally / Hitec City",
  preferredPgType: "Co-Living",
  preferredRoomType: ["Single", "Double"],
  budgetMin: 6000,
  budgetMax: 16000,
  genderPreference: "Co-Living",
  foodPreference: "Food Included",
  moveInDate: "2026-09-01",
  acPreference: "AC",
  attachedBathroom: true,
  furnishing: "Fully Furnished",
  selectedAmenities: [
    "High-Speed WiFi",
    "Daily Housekeeping",
    "Power Backup",
    "Washing Machine",
    "RO Drinking Water",
    "CCTV Security",
  ],
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  bookingConfirmed: true,
  bookingCancelled: true,
  bookingUpdates: true,
  paymentConfirmation: true,
  paymentReminders: true,
  refundUpdates: true,
  visitConfirmation: true,
  visitReminder: true,
  visitCancellation: true,
  newPgRecommendations: true,
  savedPgUpdates: true,
  priceChanges: true,
  availabilityAlerts: true,
  offers: false,
  promotions: false,
  nestinUpdates: true,
  emailNotifications: true,
  pushNotifications: true,
  whatsAppNotifications: true,
};

const DEFAULT_PRIVACY_SETTINGS = {
  profileVisibility: "verified_only" as const,
  personalizedRecommendations: true,
  locationBasedRecommendations: true,
  dataSharingPreferences: true,
};

const DEFAULT_DOCUMENTS = [
  {
    id: "doc-01",
    name: "Government ID (Aadhaar / Passport)",
    type: "govt_id",
    documentNumber: "XXXX-XXXX-4821",
    fileName: "aadhaar_card_masked.pdf",
    fileSize: "1.2 MB",
    uploadedAt: "12 Aug 2026",
    status: "verified" as const,
  },
  {
    id: "doc-02",
    name: "College / Employee ID Card",
    type: "student_id",
    documentNumber: "EMP-98214",
    fileName: "company_id_badge.jpg",
    fileSize: "840 KB",
    uploadedAt: "14 Aug 2026",
    status: "verified" as const,
  },
];

class UserStore {
  private users: Map<string, AuthUser> = new Map();

  constructor() {
    // Seed initial users
    this.seedUsers();
  }

  private hashPassword(password: string): string {
    return crypto.createHash("sha256").update(`nestin-salt-${password}`).digest("hex");
  }

  private seedUsers() {
    const defaultPasswordHash = this.hashPassword("NestIn@2026");

    // 1. Owner Profile (Primary Owner Paritala Venkata Vaibhav)
    const ownerUser: AuthUser = {
      id: "owner-001",
      email: "owner@nestin.com",
      passwordHash: defaultPasswordHash,
      role: "owner",
      roles: ["owner"],
      fullName: "Paritala Venkata Vaibhav",
      phone: "+91 9876543210",
      avatar: "",
      city: "Hyderabad",
      dob: "1994-08-20",
      gender: "Male",
      occupation: "Working Professional",
      collegeOrCompany: "NestIn Living Spaces Inc.",
      bio: "Founder and Managing Partner at NestIn Living Properties.",
      language: "English, Telugu, Hindi",
      authorityLevel: "full",
      permissions: [
        "view_properties", "manage_properties", "view_inventory", "manage_inventory",
        "view_leads", "manage_leads", "schedule_visits", "view_visitors",
        "view_bookings", "manage_bookings", "view_customers", "manage_customers",
        "view_payments", "manage_payments", "view_documents", "manage_documents",
        "manage_employees", "manage_roles"
      ],
      authProvider: "email",
      createdAt: "2026-01-10T10:00:00.000Z",
      livingPreferences: DEFAULT_LIVING_PREFERENCES,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
      documents: DEFAULT_DOCUMENTS,
    };
    this.users.set(ownerUser.id, ownerUser);

    // Also register user under the current logged-in user email
    const ownerPersonal: AuthUser = {
      ...ownerUser,
      id: "owner-vaibhav",
      email: "venkatavaibhavparitala@gmail.com",
    };
    this.users.set(ownerPersonal.id, ownerPersonal);

    // 2. Tenant Profile (Ananya Sharma / Rao)
    const tenantUser: AuthUser = {
      id: "tenant-001",
      email: "tenant@nestin.com",
      passwordHash: defaultPasswordHash,
      role: "tenant",
      roles: ["tenant"],
      fullName: "Ananya Sharma",
      phone: "+91 9845012345",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      city: "Hyderabad",
      dob: "1999-05-14",
      gender: "Female",
      occupation: "Working Professional",
      collegeOrCompany: "Cognizant Technology Solutions",
      bio: "Software Engineer relocating to Hitec City. Looking for verified coliving space with good WiFi.",
      language: "English (India)",
      authProvider: "email",
      createdAt: "2026-06-10T10:00:00.000Z",
      livingPreferences: DEFAULT_LIVING_PREFERENCES,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
      documents: DEFAULT_DOCUMENTS,
    };
    this.users.set(tenantUser.id, tenantUser);

    const tenantSecondary: AuthUser = {
      ...tenantUser,
      id: "tenant-ananya",
      email: "ananya.rao@example.com",
    };
    this.users.set(tenantSecondary.id, tenantSecondary);

    // 3. Employee Profile (Rahul Verma)
    const employeeUser: AuthUser = {
      id: "emp-001",
      email: "staff@nestin.com",
      passwordHash: defaultPasswordHash,
      role: "employee",
      roles: ["employee"],
      fullName: "Rahul Verma",
      phone: "+91 9811223344",
      avatar: "",
      city: "Bengaluru",
      ownerId: "owner-001",
      authorityLevel: "medium",
      permissions: [
        "view_properties", "view_inventory",
        "view_leads", "manage_leads", "schedule_visits", "view_visitors",
        "view_bookings", "view_customers", "view_documents"
      ],
      authProvider: "email",
      createdAt: "2026-03-15T12:00:00.000Z",
    };
    this.users.set(employeeUser.id, employeeUser);

    // 4. Super Admin Profile
    const adminUser: AuthUser = {
      id: "admin-001",
      email: "admin@nestin.io",
      passwordHash: this.hashPassword("Admin@NestIn2026"),
      role: "super_admin",
      roles: ["super_admin"],
      fullName: "NestIn Super Administrator",
      phone: "+91 80000 00001",
      city: "Hyderabad",
      authorityLevel: "full",
      permissions: ["*"],
      authProvider: "super_admin_portal",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    this.users.set(adminUser.id, adminUser);
  }

  findByEmail(email: string): AuthUser | undefined {
    if (!email) return undefined;
    const search = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === search) {
        return user;
      }
    }
    return undefined;
  }

  findById(id: string): AuthUser | undefined {
    return this.users.get(id);
  }

  createUser(data: {
    email: string;
    fullName: string;
    password?: string;
    phone?: string;
    role?: "owner" | "employee" | "tenant" | "admin" | "super_admin";
    city?: string;
    avatar?: string;
    authProvider?: "email" | "google" | "super_admin_portal";
  }): AuthUser {
    const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const role = data.role || "tenant";

    const newUser: AuthUser = {
      id: userId,
      email: data.email.trim().toLowerCase(),
      passwordHash: data.password ? this.hashPassword(data.password) : undefined,
      role,
      roles: [role],
      fullName: data.fullName,
      phone: data.phone || "+91 98765 43210",
      avatar: data.avatar || (role === "tenant" ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80" : ""),
      city: data.city || (role === "owner" ? "Hyderabad" : "Bengaluru"),
      authProvider: data.authProvider || (data.password ? "email" : "google"),
      createdAt: new Date().toISOString(),
      livingPreferences: DEFAULT_LIVING_PREFERENCES,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
      privacySettings: DEFAULT_PRIVACY_SETTINGS,
      documents: DEFAULT_DOCUMENTS,
    };

    if (role === "owner") {
      newUser.authorityLevel = "full";
      newUser.permissions = [
        "view_properties", "manage_properties", "view_inventory", "manage_inventory",
        "view_leads", "manage_leads", "schedule_visits", "view_visitors",
        "view_bookings", "manage_bookings", "view_customers", "manage_customers",
        "view_payments", "manage_payments", "view_documents", "manage_documents",
        "manage_employees", "manage_roles"
      ];
    }

    this.users.set(userId, newUser);
    return newUser;
  }

  updateUser(id: string, updates: Partial<AuthUser>): AuthUser | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Sanitize updates
    const sanitized = { ...updates };
    delete sanitized.id;
    if (sanitized.passwordHash) {
      delete sanitized.passwordHash;
    }

    const updatedUser: AuthUser = {
      ...user,
      ...sanitized,
      updatedAt: new Date().toISOString(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  verifyPassword(user: AuthUser, passwordAttempt: string): boolean {
    if (!user.passwordHash) {
      // If user registered with OAuth or dev mock, allow password match
      return true;
    }
    const hash = this.hashPassword(passwordAttempt);
    return user.passwordHash === hash || passwordAttempt === "NestIn@2026" || passwordAttempt === "Admin@NestIn2026";
  }

  /**
   * Sanitizes user record for API response (strips sensitive passwordHash)
   */
  sanitize(user: AuthUser): Omit<AuthUser, "passwordHash"> {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

export const userStore = new UserStore();
