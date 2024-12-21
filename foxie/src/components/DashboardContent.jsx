import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import Pomodoro from "./Pomodoro";

const DashboardContent = ({ isSidebarExpanded }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    if (!user) return;

    const assignmentsQuery = collection(firestore, "users", user.uid, "assignments");
    const calendarEventsQuery = collection(firestore, "users", user.uid, "calendarEvents");

    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      setAssignments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeCalendarEvents = onSnapshot(calendarEventsQuery, (snapshot) => {
      setCalendarEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const today = new Date();
    setCurrentDate(today.toLocaleDateString("en-US", { dateStyle: "full" }));

    return () => {
      unsubscribeAssignments();
      unsubscribeCalendarEvents();
    };
  }, [user]);

  // Filters for assignments
  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === "all") return assignments;
    const today = new Date();
    const rangeEnd = new Date(today);
    if (assignmentFilter === "week") rangeEnd.setDate(today.getDate() + 7);
    if (assignmentFilter === "month") rangeEnd.setMonth(today.getMonth() + 1);

    return assignments.filter((assignment) => {
      const dueDate = new Date(assignment.dueDate);
      return dueDate >= today && dueDate <= rangeEnd;
    });
  }, [assignments, assignmentFilter]);

  // Filters for events
  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return calendarEvents;
    const today = new Date();
    const rangeEnd = new Date(today);
    if (eventFilter === "week") rangeEnd.setDate(today.getDate() + 7);
    if (eventFilter === "month") rangeEnd.setMonth(today.getMonth() + 1);

    return calendarEvents.filter((event) => {
      const startDate = new Date(event.start);
      return startDate >= today && startDate <= rangeEnd;
    });
  }, [calendarEvents, eventFilter]);

  return (
    <div
      className={`flex-1 bg-gray-800 p-6 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "ml-64" : "ml-20"
      }`}
    >
      {/* Greeting and Date */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f06937]">
          Welcome, {user?.displayName || user?.email || "User"}!
        </h1>
        <p className="text-gray-400">{currentDate}</p>
      </div>

      {/* Pomodoro Timer */}
      <div className="mb-6 bg-gray-900 p-5 rounded-lg shadow-lg">
        <Pomodoro />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What's Due Section */}
        <div className="bg-gray-900 p-5 rounded-lg">
          <h2 className="text-xl text-white mb-4">What's Due (Assignments)</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setAssignmentFilter("all")}
              className={`px-4 py-2 rounded ${
                assignmentFilter === "all" ? "bg-[#f06937] text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAssignmentFilter("week")}
              className={`px-4 py-2 rounded ${
                assignmentFilter === "week" ? "bg-[#f06937] text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setAssignmentFilter("month")}
              className={`px-4 py-2 rounded ${
                assignmentFilter === "month" ? "bg-[#f06937] text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              This Month
            </button>
          </div>
          <ul>
            {filteredAssignments.map((assignment) => (
              <li key={assignment.id} className="mb-2 text-white">
                {assignment.title} - Due: {new Date(assignment.dueDate).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>

        {/* Upcoming Section */}
        <div className="bg-gray-900 p-5 rounded-lg">
          <h2 className="text-xl text-white mb-4">Upcoming (Events)</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setEventFilter("all")}
              className={`px-4 py-2 rounded ${
                eventFilter === "all" ? "bg-[#f06937] text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setEventFilter("week")}
              className={`px-4 py-2 rounded ${
                eventFilter === "week" ? "bg-[#f06937] text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setEventFilter("month")}
              className={`px-4 py-2 rounded ${
                eventFilter === "month" ? "bg-[#f06937] text-white" : "bg-gray-700 text-gray-400"
              }`}
            >
              This Month
            </button>
          </div>
          <ul>
            {filteredEvents.map((event) => (
              <li key={event.id} className="mb-2 text-white">
                {event.title} - {new Date(event.start).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>

        {/* Calendar Section */}
        <div className="col-span-1 lg:col-span-2 bg-gray-900 p-5 rounded-lg">
          <h2 className="text-xl text-white mb-4">Calendar</h2>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={calendarEvents.map((event) => ({
              title: event.title,
              start: event.start,
              allDay: event.allDay,
            }))}
            height="auto"
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
