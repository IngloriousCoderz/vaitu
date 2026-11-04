// First match wins: literal paths before parameterised ones (/jobs/new before
// /jobs/:jobId). Values are entity ids.

export const routes = {
  "/login": "authentication",
  "/onboarding": "onboarding",

  "/": "jobList",
  "/jobs": "jobList",
  "/applications": "applicationList",
  "/profile": "profile",

  "/jobs/mine": "myJobs",
  "/jobs/new": "jobCreate",
  "/jobs/:jobId/edit": "jobCreate",

  "/jobs/:jobId": "jobDetail",
  "/jobs/:jobId/applications": "applicationsReceived",
  "/applications/:applicationId": "applicationDetail",
  "/notifications": "notifications",
  "/ranks": "ranks",
  "/preferences": "preferences",
  "/about": "about",
  "/erase-account": "eraseAccount",
  "/unsubscribe": "unsubscribe",

  "*": "notFound",
}

export const paths = {
  jobs: "/jobs",
  myJobs: "/jobs/mine",
  newJob: "/jobs/new",
  job: (jobId) => `/jobs/${jobId}`,
  editJob: (jobId) => `/jobs/${jobId}/edit`,
  receivedApplications: (jobId) => `/jobs/${jobId}/applications`,
  applications: "/applications",
  applicationsByStatus: (status) => `/applications?status=${status}`,
  application: (applicationId) => `/applications/${applicationId}`,
  notifications: "/notifications",
  profile: "/profile",
  ranks: "/ranks",
  preferences: "/preferences",
  about: "/about",
  eraseAccount: "/erase-account",
  unsubscribe: "/unsubscribe",
  login: "/login",
  onboarding: "/onboarding",
}
