export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "MEL Platform API",
    version: "1.0.0",
    description:
      "REST API for the MEL (Monitoring, Evaluation & Learning) Platform. All protected endpoints require a Bearer JWT token obtained from POST /api/auth/login.",
  },
  servers: [
    { url: "http://localhost:4000", description: "Local development" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["ADMIN", "PROJECT_LEAD"] },
          isActive: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              email: { type: "string", format: "email" },
              role: { type: "string", enum: ["ADMIN", "PROJECT_LEAD"] },
            },
          },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string", nullable: true },
          programLead: { type: "string", nullable: true },
          projectSupport: { type: "string", nullable: true },
          generalCategory: { type: "string", nullable: true },
          specificCategory: { type: "string", nullable: true },
          expectedUsers: { type: "integer", nullable: true },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time", nullable: true },
          reportingInterval: {
            type: "string",
            enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
          },
          leadId: { type: "integer", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Report: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          periodStart: { type: "string", format: "date-time" },
          periodEnd: { type: "string", format: "date-time" },
          status: {
            type: "string",
            enum: [
              "DRAFT",
              "SUBMITTED",
              "UNDER_REVIEW",
              "EDIT_REQUESTED",
              "PUBLISHED",
              "COMPLETED",
            ],
          },
          learningSummary: { type: "string", nullable: true },
          projectId: { type: "integer" },
          leadId: { type: "integer" },
          submittedAt: { type: "string", format: "date-time", nullable: true },
          publishedAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          entity: { type: "string" },
          entityId: { type: "integer" },
          action: { type: "string" },
          oldValues: { type: "object", nullable: true },
          newValues: { type: "object", nullable: true },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      DisaggregatedData: {
        type: "object",
        properties: {
          id: { type: "integer" },
          projectId: { type: "integer" },
          reportId: { type: "integer" },
          indicatorId: { type: "integer" },
          Economy: { type: "number", nullable: true },
          Infrastructure: { type: "number", nullable: true },
          Institution: { type: "number", nullable: true },
          Operator: { type: "number", nullable: true },
          Gender: { type: "string", nullable: true },
          Age: { type: "string", nullable: true },
          Sector: { type: "string", nullable: true },
          ASN: { type: "string", nullable: true },
          Technology: { type: "string", nullable: true },
          Disability: { type: "string", nullable: true },
          RuralUrban: { type: "string", nullable: true },
          Topic: { type: "string", nullable: true },
          StakeholderType: { type: "string", nullable: true },
          Dialogues: { type: "number", nullable: true },
          DialoguesText: { type: "string", nullable: true },
          PartnerType: { type: "string", nullable: true },
          NumberOfUsers: { type: "number", nullable: true },
          Language: { type: "string", nullable: true },
          City: { type: "string", nullable: true },
          Notes: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "integer" },
          userId: { type: "integer" },
          type: {
            type: "string",
            enum: ["PROJECT_ASSIGNED", "REPORT_SUBMITTED", "REPORT_PUBLISHED", "EDIT_REQUESTED"],
          },
          title: { type: "string" },
          message: { type: "string" },
          data: { type: "object", nullable: true },
          isRead: { type: "boolean" },
          readAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Users", description: "User management (Admin only)" },
    { name: "Projects", description: "Project management" },
    { name: "Reports", description: "Report management" },
    { name: "Disaggregated Data", description: "Indicator disaggregated data" },
    { name: "Audit Logs", description: "Audit trail (Admin only)" },
    { name: "Analytics", description: "Reporting analytics" },
    { name: "Notifications", description: "Per-user notification management with real-time WebSocket support" },
  ],
  paths: {
    // ─── AUTH ────────────────────────────────────────────────────────────────
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "admin@mel.org" },
                  password: { type: "string", format: "password", example: "password123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (client discards JWT)",
        security: [],
        responses: {
          200: {
            description: "Logout acknowledged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/invite/{token}": {
      get: {
        tags: ["Auth"],
        summary: "Get invite details by token",
        security: [],
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Invite details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    role: { type: "string" },
                  },
                },
              },
            },
          },
          400: { description: "Invalid or expired invite link", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Auth"],
        summary: "Accept invite and set password",
        security: [],
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["password"],
                properties: {
                  password: { type: "string", minLength: 8, example: "newpassword123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Account activated — returns JWT and user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: { description: "Invalid invite or weak password", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ─── USERS ───────────────────────────────────────────────────────────────
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List all users",
        description: "Requires ADMIN role.",
        responses: {
          200: {
            description: "Array of users",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/User" } },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create a new user and send an invite email",
        description: "Requires ADMIN role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "role"],
                properties: {
                  name: { type: "string", example: "Jane Doe" },
                  email: { type: "string", format: "email", example: "jane@mel.org" },
                  role: { type: "string", enum: ["ADMIN", "PROJECT_LEAD"] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          400: { description: "Validation error or duplicate email", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/users/{id}": {
      patch: {
        tags: ["Users"],
        summary: "Update a user",
        description: "Requires ADMIN role. Supports partial updates.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string", enum: ["ADMIN", "PROJECT_LEAD"] },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated user", content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } } },
          404: { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },

    // ─── PROJECTS ────────────────────────────────────────────────────────────
    "/api/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects",
        description: "ADMIN sees all projects; PROJECT_LEAD sees only their assigned projects.",
        responses: {
          200: {
            description: "Array of projects",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Project" } },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a new project",
        description: "Requires ADMIN role.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "startDate", "reportingInterval"],
                properties: {
                  name: { type: "string", example: "Digital Inclusion 2025" },
                  description: { type: "string" },
                  category: { type: "string" },
                  generalCategory: { type: "string" },
                  specificCategory: { type: "string" },
                  programLead: { type: "string" },
                  projectSupport: { type: "string" },
                  expectedUsers: { type: "integer" },
                  startDate: { type: "string", format: "date", example: "2025-01-01" },
                  endDate: { type: "string", format: "date", example: "2025-12-31" },
                  reportingInterval: { type: "string", enum: ["MONTHLY", "QUARTERLY", "YEARLY"] },
                  leadId: { type: "integer", nullable: true },
                  objectives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        outcomes: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              indicators: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Project created", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get a single project",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Project detail", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          403: { description: "Forbidden" },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
        },
      },
      put: {
        tags: ["Projects"],
        summary: "Update a project",
        description: "Requires ADMIN role. All fields optional.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  generalCategory: { type: "string" },
                  specificCategory: { type: "string" },
                  programLead: { type: "string" },
                  projectSupport: { type: "string" },
                  expectedUsers: { type: "integer" },
                  startDate: { type: "string", format: "date" },
                  endDate: { type: "string", format: "date" },
                  reportingInterval: { type: "string", enum: ["MONTHLY", "QUARTERLY", "YEARLY"] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated project", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
      delete: {
        tags: ["Projects"],
        summary: "Delete a project",
        description: "Requires ADMIN role. Cascades to objectives, outcomes, indicators, reports and disaggregated data.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          204: { description: "Deleted successfully" },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/projects/{id}/assign-lead": {
      post: {
        tags: ["Projects"],
        summary: "Assign a Project Lead to a project",
        description: "Requires ADMIN role. The target user must have the PROJECT_LEAD role.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["leadId"],
                properties: {
                  leadId: { type: "integer", example: 3 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Project with updated leadId", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },

    // ─── REPORTS ─────────────────────────────────────────────────────────────
    "/api/reports": {
      get: {
        tags: ["Reports"],
        summary: "List reports",
        description: "ADMIN sees all reports; PROJECT_LEAD sees only their reports.",
        responses: {
          200: {
            description: "Array of reports",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Report" } },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Reports"],
        summary: "Create a new report",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "projectId", "periodStart", "periodEnd"],
                properties: {
                  title: { type: "string", example: "Q1 2025 Report" },
                  projectId: { type: "integer", example: 1 },
                  periodStart: { type: "string", format: "date", example: "2025-01-01" },
                  periodEnd: { type: "string", format: "date", example: "2025-03-31" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Report created", content: { "application/json": { schema: { $ref: "#/components/schemas/Report" } } } },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Project not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/reports/{id}": {
      get: {
        tags: ["Reports"],
        summary: "Get a single report",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "Report detail", content: { "application/json": { schema: { $ref: "#/components/schemas/Report" } } } },
          403: { description: "Forbidden" },
          404: { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
        },
      },
      put: {
        tags: ["Reports"],
        summary: "Update a report",
        description: "Only DRAFT or EDIT_REQUESTED reports can be edited.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  learningSummary: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated report", content: { "application/json": { schema: { $ref: "#/components/schemas/Report" } } } },
          400: { description: "Cannot edit report in current status", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Forbidden" },
          404: { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/reports/{id}/status": {
      post: {
        tags: ["Reports"],
        summary: "Change report status",
        description:
          "Drives the report workflow. Actions: `SUBMIT` (PROJECT_LEAD), `REQUEST_EDIT` (ADMIN), `APPROVE_EDIT` (ADMIN), `PUBLISH` (ADMIN), `COMPLETE` (ADMIN).",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: {
                    type: "string",
                    enum: ["SUBMIT", "REQUEST_EDIT", "APPROVE_EDIT", "PUBLISH", "COMPLETE"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Updated report", content: { "application/json": { schema: { $ref: "#/components/schemas/Report" } } } },
          400: { description: "Invalid action or business rule violation", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Forbidden" },
          404: { description: "Report not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ─── DISAGGREGATED DATA ───────────────────────────────────────────────────
    "/api/disaggregated-data": {
      post: {
        tags: ["Disaggregated Data"],
        summary: "Submit disaggregated indicator data",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reportId", "indicatorId"],
                properties: {
                  reportId: { type: "integer", example: 1 },
                  indicatorId: { type: "integer", example: 5 },
                  projectId: { type: "integer", example: 1 },
                  Economy: { type: "number" },
                  Infrastructure: { type: "number" },
                  Institution: { type: "number" },
                  Operator: { type: "number" },
                  Gender: { type: "string" },
                  Age: { type: "string" },
                  Sector: { type: "string" },
                  ASN: { type: "string" },
                  Technology: { type: "string" },
                  Disability: { type: "string" },
                  RuralUrban: { type: "string" },
                  Topic: { type: "string" },
                  StakeholderType: { type: "string" },
                  Dialogues: { type: "number" },
                  DialoguesText: { type: "string" },
                  PartnerType: { type: "string" },
                  NumberOfUsers: { type: "number" },
                  Language: { type: "string" },
                  City: { type: "string" },
                  Notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Disaggregated data record created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/DisaggregatedData" } } },
          },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Forbidden" },
          404: { description: "Report or indicator not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ─── AUDIT LOGS ──────────────────────────────────────────────────────────
    "/api/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        summary: "List audit logs",
        description: "Requires ADMIN role.",
        parameters: [
          { name: "entity", in: "query", schema: { type: "string" }, description: "Filter by entity type, e.g. User, Project, Report" },
          { name: "userId", in: "query", schema: { type: "integer" }, description: "Filter by user id" },
          { name: "action", in: "query", schema: { type: "string" }, description: "Filter by action, e.g. CREATE, UPDATE, DELETE" },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "Max records to return" },
        ],
        responses: {
          200: {
            description: "Array of audit log entries",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },

    // ─── ANALYTICS ───────────────────────────────────────────────────────────
    "/api/analytics/reports": {
      get: {
        tags: ["Analytics"],
        summary: "Get report analytics with optional filters",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" }, description: "Filter by project category" },
          { name: "status", in: "query", schema: { type: "string" }, description: "Filter by report status" },
          { name: "leadId", in: "query", schema: { type: "integer" }, description: "Filter by lead user id" },
          { name: "from", in: "query", schema: { type: "string", format: "date" }, description: "Period start >= this date" },
          { name: "to", in: "query", schema: { type: "string", format: "date" }, description: "Period start <= this date" },
          { name: "reportingInterval", in: "query", schema: { type: "string", enum: ["MONTHLY", "QUARTERLY", "YEARLY"] } },
        ],
        responses: {
          200: {
            description: "Analytics summary",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    total: { type: "integer" },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          title: { type: "string" },
                          status: { type: "string" },
                          periodStart: { type: "string", format: "date-time" },
                          periodEnd: { type: "string", format: "date-time" },
                          project: {
                            type: "object",
                            properties: {
                              id: { type: "integer" },
                              name: { type: "string" },
                              category: { type: "string" },
                              reportingInterval: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications for the authenticated user",
        description: "Returns all notifications belonging to the current user, newest first. Add `?unreadOnly=true` to filter unread only.",
        parameters: [
          {
            name: "unreadOnly",
            in: "query",
            required: false,
            schema: { type: "boolean" },
            description: "If true, returns only unread notifications",
          },
        ],
        responses: {
          200: {
            description: "Array of notifications",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Notification" },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Get unread notification count for the authenticated user",
        responses: {
          200: {
            description: "Unread count",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { count: { type: "integer", example: 3 } },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        responses: {
          200: { description: "All notifications marked as read" },
          401: { description: "Unauthorized" },
        },
      },
    },

    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark a single notification as read",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: {
          200: {
            description: "Updated notification",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Notification" },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden – notification belongs to another user" },
          404: { description: "Notification not found" },
        },
      },
    },
  },
};
