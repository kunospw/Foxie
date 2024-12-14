import { gapi } from "gapi-script";

export const getGoogleCalendarEvents = async () => {
  try {
    const events = await gapi.client.calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: "startTime",
    });
    return events.result.items || [];
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return [];
  }
};
