import { describe, expect, it } from "vitest"

import {
  interpolate,
  notificationTypeKey,
  pathFor,
  pushFor,
  pushParamsFor,
} from "./push-copy.js"

describe("push-copy pure composition", () => {
  it("notificationTypeKey converts snake_case to camelCase", () => {
    expect(notificationTypeKey("application_received")).toBe(
      "applicationReceived",
    )
    expect(notificationTypeKey("application_selected")).toBe(
      "applicationSelected",
    )
    expect(notificationTypeKey("application_rejected")).toBe(
      "applicationRejected",
    )
    expect(notificationTypeKey("")).toBe("")
    expect(notificationTypeKey(null)).toBe(null)
    expect(notificationTypeKey(undefined)).toBe(undefined)
  })

  it("interpolate fills {{param}} placeholders", () => {
    expect(interpolate("Hello {{name}}", { name: "World" })).toBe("Hello World")
    expect(interpolate("{{a}} and {{b}}", { a: "1", b: "2" })).toBe("1 and 2")
    expect(interpolate("missing {{x}}", {})).toBe("missing ")
    expect(interpolate(null, { x: "y" })).toBe("")
    expect(interpolate("no placeholders")).toBe("no placeholders")
  })

  it("pathFor routes application_received to receivedApplications when event open", () => {
    expect(
      pathFor({
        type: "application_received",
        event_id: "evt-123",
        event_status: "open",
        application_id: null,
      }),
    ).toBe("/events/evt-123/applications")
  })

  it("pathFor routes application_received to event when event closed", () => {
    expect(
      pathFor({
        type: "application_received",
        event_id: "evt-123",
        event_status: "closed",
        application_id: null,
      }),
    ).toBe("/events/evt-123")
  })

  it("pathFor routes application_received to events when no event_id", () => {
    expect(
      pathFor({
        type: "application_received",
        event_id: null,
        event_status: "open",
        application_id: null,
      }),
    ).toBe("/events")
  })

  it("pathFor routes application_selected to application detail", () => {
    expect(
      pathFor({
        type: "application_selected",
        event_id: "evt-123",
        event_status: "open",
        application_id: "app-456",
      }),
    ).toBe("/applications/app-456")
  })

  it("pathFor routes application_rejected to application detail", () => {
    expect(
      pathFor({
        type: "application_rejected",
        event_id: "evt-123",
        event_status: "open",
        application_id: "app-456",
      }),
    ).toBe("/applications/app-456")
  })

  it("pathFor routes unknown type to event or events", () => {
    expect(
      pathFor({
        type: "other",
        event_id: "evt-123",
        event_status: "open",
        application_id: null,
      }),
    ).toBe("/events/evt-123")
    expect(
      pathFor({
        type: "other",
        event_id: null,
        event_status: "open",
        application_id: null,
      }),
    ).toBe("/events")
  })

  it("pushParamsFor returns name+title for application_received", () => {
    expect(
      pushParamsFor({
        type: "application_received",
        event_title: "My Wedding",
        applicant_name: "John Doe",
      }),
    ).toEqual({ name: "John Doe", title: "My Wedding" })
  })

  it("pushParamsFor returns only title for decisions", () => {
    expect(
      pushParamsFor({
        type: "application_selected",
        event_title: "My Wedding",
      }),
    ).toEqual({ title: "My Wedding" })
  })

  it("pushFor assembles the whole notification payload", () => {
    const catalogue = {
      notifications: {
        types: {
          applicationReceived: "{{name}} applied to {{title}}",
        },
      },
    }
    const fallback = {
      notifications: {
        types: {
          applicationReceived: "{{name}} applied to {{title}}",
        },
      },
    }
    expect(
      pushFor(
        {
          type: "application_received",
          event_id: "evt-123",
          event_status: "open",
          application_id: null,
          event_title: "My Wedding",
          applicant_name: "John Doe",
        },
        catalogue,
        fallback,
      ),
    ).toEqual({
      title: "Vaitu",
      body: "John Doe applied to My Wedding",
      url: "/events/evt-123/applications",
    })
  })

  it("pushFor falls back to English when locale missing the type", () => {
    const catalogue = { notifications: { types: {} } }
    const fallback = {
      notifications: {
        types: { applicationReceived: "EN: {{name}} applied to {{title}}" },
      },
    }
    expect(
      pushFor(
        {
          type: "application_received",
          event_id: "evt-123",
          event_status: "open",
          application_id: null,
          event_title: "My Wedding",
          applicant_name: "John Doe",
        },
        catalogue,
        fallback,
      ).body,
    ).toBe("EN: John Doe applied to My Wedding")
  })
})
