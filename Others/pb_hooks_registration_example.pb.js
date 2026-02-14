// PocketBase Hook for Organization Registration
// Place this in: pb_hooks/main.pb.js or pb_hooks/registration.pb.js

routerAdd("POST", "/api/openhr/register", (c) => {
  const data = $apis.requestInfo(c);

  // Extract fields from FormData
  const orgName = data.data.orgName;
  const adminName = data.data.adminName;
  const email = data.data.email;
  const password = data.data.password;
  const country = data.data.country || 'BD'; // Default to Bangladesh if not provided
  const address = data.data.address || '';

  // Validate required fields
  if (!orgName || !adminName || !email || !password) {
    throw new BadRequestError("Missing required fields");
  }

  if (!country) {
    throw new BadRequestError("Country is required");
  }

  // Validate country code (2-letter ISO code)
  if (country.length !== 2 || !/^[A-Z]{2}$/.test(country)) {
    throw new BadRequestError("Invalid country code. Must be 2-letter ISO code (e.g., BD, US, IN)");
  }

  try {
    // 1. Create organization record
    const orgsCollection = $app.dao().findCollectionByNameOrId("organizations");
    const org = new Record(orgsCollection);
    org.set("name", orgName);
    org.set("country", country);
    org.set("address", address);

    // Handle logo file upload if provided
    if (data.files && data.files.logo && data.files.logo.length > 0) {
      org.set("logo", data.files.logo[0]);
    }

    // Set subscription defaults
    org.set("subscriptionStatus", "TRIAL");
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days trial
    org.set("trialEndDate", trialEndDate.toISOString());

    $app.dao().saveRecord(org);

    console.log("Organization created:", org.id, "Country:", country);

    // 2. Create admin user
    const usersCollection = $app.dao().findCollectionByNameOrId("users");
    const user = new Record(usersCollection);
    user.set("name", adminName);
    user.set("email", email);
    user.set("password", password);
    user.set("passwordConfirm", password);
    user.set("role", "ADMIN");
    user.set("organization_id", org.id);
    user.set("department", "Management");
    user.set("designation", "Administrator");
    user.set("employee_id", "ADMIN001");
    user.set("verified", false);

    $app.dao().saveRecord(user);

    console.log("Admin user created:", user.id);

    // 3. Send verification email
    try {
      $app.dao().requestVerification(user);
      console.log("Verification email sent to:", email);
    } catch (verifyErr) {
      console.error("Failed to send verification email:", verifyErr);
      // Don't fail registration if email fails
    }

    // 4. Initialize organization settings with country-based defaults
    const settingsCollection = $app.dao().findCollectionByNameOrId("settings");

    // Load country-based holidays
    const holidays = loadHolidaysForCountry(country);
    if (holidays && holidays.length > 0) {
      const holidaysSetting = new Record(settingsCollection);
      holidaysSetting.set("organization_id", org.id);
      holidaysSetting.set("key", "holidays");
      holidaysSetting.set("value", holidays);
      $app.dao().saveRecord(holidaysSetting);
      console.log("Holidays initialized for country:", country, "Count:", holidays.length);
    }

    // Initialize AppConfig with country-based defaults
    const countryDefaults = getCountryDefaults(country);
    const config = {
      companyName: orgName,
      currency: countryDefaults.currency,
      timezone: countryDefaults.timezone,
      dateFormat: countryDefaults.dateFormat,
      workingDays: countryDefaults.workingDays,
      officeStartTime: "09:00",
      officeEndTime: "18:00",
      lateGracePeriod: 15,
      earlyOutGracePeriod: 15,
      earliestCheckIn: "06:00",
      autoSessionCloseTime: "23:59",
      autoAbsentEnabled: true,
      autoAbsentTime: "23:55"
    };

    const configSetting = new Record(settingsCollection);
    configSetting.set("organization_id", org.id);
    configSetting.set("key", "config");
    configSetting.set("value", config);
    $app.dao().saveRecord(configSetting);

    console.log("AppConfig initialized with defaults for:", country);

    // Initialize departments
    const deptsSetting = new Record(settingsCollection);
    deptsSetting.set("organization_id", org.id);
    deptsSetting.set("key", "departments");
    deptsSetting.set("value", ["Management", "HR", "Engineering", "Sales", "Marketing", "Operations", "Finance"]);
    $app.dao().saveRecord(deptsSetting);

    // Initialize designations
    const desigSetting = new Record(settingsCollection);
    desigSetting.set("organization_id", org.id);
    desigSetting.set("key", "designations");
    desigSetting.set("value", ["Administrator", "Manager", "Team Lead", "Senior", "Junior", "Intern"]);
    $app.dao().saveRecord(desigSetting);

    // Initialize leave policy
    const leavePolicySetting = new Record(settingsCollection);
    leavePolicySetting.set("organization_id", org.id);
    leavePolicySetting.set("key", "leave_policy");
    leavePolicySetting.set("value", {
      defaults: { ANNUAL: 15, CASUAL: 10, SICK: 14 },
      overrides: {}
    });
    $app.dao().saveRecord(leavePolicySetting);

    return c.json(200, {
      success: true,
      message: "Organization registered successfully. Please check your email to verify your account."
    });

  } catch (err) {
    console.error("Registration error:", err);

    // Clean up if organization was created but user creation failed
    if (org && org.id) {
      try {
        $app.dao().deleteRecord(org);
      } catch (cleanupErr) {
        console.error("Failed to cleanup organization:", cleanupErr);
      }
    }

    throw new BadRequestError("Registration failed: " + err.message);
  }
});

// Helper function to load country-based holidays
function loadHolidaysForCountry(countryCode) {
  const holidayData = {
    "BD": [
      { id: "bd-h1", date: "2026-02-21", name: "International Mother Language Day", isGovernment: true, type: "NATIONAL" },
      { id: "bd-h2", date: "2026-03-17", name: "Sheikh Mujibur Rahman's Birthday", isGovernment: true, type: "NATIONAL" },
      { id: "bd-h3", date: "2026-03-26", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
      { id: "bd-h4", date: "2026-04-14", name: "Pohela Boishakh (Bengali New Year)", isGovernment: true, type: "FESTIVAL" },
      { id: "bd-h5", date: "2026-05-01", name: "May Day", isGovernment: true, type: "NATIONAL" },
      { id: "bd-h6", date: "2026-08-15", name: "National Mourning Day", isGovernment: true, type: "NATIONAL" },
      { id: "bd-h7", date: "2026-12-16", name: "Victory Day", isGovernment: true, type: "NATIONAL" },
      { id: "bd-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
    ],
    "US": [
      { id: "us-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h2", date: "2026-01-19", name: "Martin Luther King Jr. Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h3", date: "2026-02-16", name: "Presidents' Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h4", date: "2026-05-25", name: "Memorial Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h5", date: "2026-07-04", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h6", date: "2026-09-07", name: "Labor Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h7", date: "2026-10-12", name: "Columbus Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h8", date: "2026-11-11", name: "Veterans Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h9", date: "2026-11-26", name: "Thanksgiving Day", isGovernment: true, type: "NATIONAL" },
      { id: "us-h10", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
    ],
    "IN": [
      { id: "in-h1", date: "2026-01-26", name: "Republic Day", isGovernment: true, type: "NATIONAL" },
      { id: "in-h2", date: "2026-03-11", name: "Holi", isGovernment: true, type: "FESTIVAL" },
      { id: "in-h3", date: "2026-04-02", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
      { id: "in-h4", date: "2026-08-15", name: "Independence Day", isGovernment: true, type: "NATIONAL" },
      { id: "in-h5", date: "2026-10-02", name: "Gandhi Jayanti", isGovernment: true, type: "NATIONAL" },
      { id: "in-h6", date: "2026-10-22", name: "Dussehra", isGovernment: true, type: "FESTIVAL" },
      { id: "in-h7", date: "2026-11-11", name: "Diwali", isGovernment: true, type: "FESTIVAL" },
      { id: "in-h8", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" }
    ],
    "GB": [
      { id: "gb-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
      { id: "gb-h2", date: "2026-04-03", name: "Good Friday", isGovernment: true, type: "FESTIVAL" },
      { id: "gb-h3", date: "2026-04-06", name: "Easter Monday", isGovernment: true, type: "FESTIVAL" },
      { id: "gb-h4", date: "2026-05-04", name: "Early May Bank Holiday", isGovernment: true, type: "NATIONAL" },
      { id: "gb-h5", date: "2026-05-25", name: "Spring Bank Holiday", isGovernment: true, type: "NATIONAL" },
      { id: "gb-h6", date: "2026-08-31", name: "Summer Bank Holiday", isGovernment: true, type: "NATIONAL" },
      { id: "gb-h7", date: "2026-12-25", name: "Christmas Day", isGovernment: true, type: "FESTIVAL" },
      { id: "gb-h8", date: "2026-12-28", name: "Boxing Day", isGovernment: true, type: "FESTIVAL" }
    ],
    "AE": [
      { id: "ae-h1", date: "2026-01-01", name: "New Year's Day", isGovernment: true, type: "NATIONAL" },
      { id: "ae-h2", date: "2026-12-02", name: "National Day", isGovernment: true, type: "NATIONAL" },
      { id: "ae-h3", date: "2026-12-03", name: "National Day Holiday", isGovernment: true, type: "NATIONAL" }
    ],
    "SA": [
      { id: "sa-h1", date: "2026-09-23", name: "Saudi National Day", isGovernment: true, type: "NATIONAL" },
      { id: "sa-h2", date: "2026-02-22", name: "Foundation Day", isGovernment: true, type: "NATIONAL" }
    ]
  };

  return holidayData[countryCode] || [];
}

// Helper function to get country defaults
function getCountryDefaults(countryCode) {
  const defaults = {
    "BD": { currency: "BDT", timezone: "Asia/Dhaka", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
    "US": { currency: "USD", timezone: "America/New_York", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "MM/DD/YYYY" },
    "IN": { currency: "INR", timezone: "Asia/Kolkata", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], dateFormat: "DD/MM/YYYY" },
    "GB": { currency: "GBP", timezone: "Europe/London", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
    "AE": { currency: "AED", timezone: "Asia/Dubai", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
    "SA": { currency: "SAR", timezone: "Asia/Riyadh", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" },
    "PK": { currency: "PKR", timezone: "Asia/Karachi", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], dateFormat: "DD/MM/YYYY" },
    "MY": { currency: "MYR", timezone: "Asia/Kuala_Lumpur", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
    "SG": { currency: "SGD", timezone: "Asia/Singapore", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
    "PH": { currency: "PHP", timezone: "Asia/Manila", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "MM/DD/YYYY" },
    "NG": { currency: "NGN", timezone: "Africa/Lagos", workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"], dateFormat: "DD/MM/YYYY" },
    "EG": { currency: "EGP", timezone: "Africa/Cairo", workingDays: ["Sunday","Monday","Tuesday","Wednesday","Thursday"], dateFormat: "DD/MM/YYYY" }
  };

  return defaults[countryCode] || {
    currency: "USD",
    timezone: "UTC",
    workingDays: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    dateFormat: "DD/MM/YYYY"
  };
}
