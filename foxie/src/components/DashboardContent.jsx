import React, { useEffect, useState, useMemo } from "react";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import Modal from "./Modal";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const DashboardContent = ({ isSidebarExpanded }) => {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ type: "", collectionName: "" });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    setCurrentDate(today.toLocaleDateString("en-US", { dateStyle: "full" }));

    // Assignments query
    const assignmentsQuery = query(
      collection(firestore, "users", user.uid, "assignments")
    );

    // Calendar Events query
    const calendarEventsQuery = query(
      collection(firestore, "users", user.uid, "calendarEvents")
    );

    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      setAssignments(snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      })));
    });

    const unsubscribeCalendarEvents = onSnapshot(calendarEventsQuery, (snapshot) => {
      setCalendarEvents(snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      })));
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeCalendarEvents();
    };
  }, [user]);

  // Compute sorted upcoming events (both assignments and calendar events)
  const sortedUpcomingEvents = useMemo(() => {
    const today = new Date();
    
    // Combine assignments and calendar events
    const combinedEvents = [
      ...assignments.map(assignment => ({
        ...assignment,
        type: 'assignment',
        date: new Date(assignment.dueDate)
      })),
      ...calendarEvents.map(event => ({
        ...event,
        type: 'event',
        date: new Date(event.start)
      }))
    ];

    // Sort events by date, keeping only future events
    return combinedEvents
      .filter(event => event.date >= today)
      .sort((a, b) => a.date - b.date);
  }, [assignments, calendarEvents]);

  // Compute what's due (events due soon)
  const whatsDue = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return sortedUpcomingEvents
      .filter(event => event.date <= nextWeek)
      .slice(0, 5); // Limit to top 5 upcoming events
  }, [sortedUpcomingEvents]);

  const handleDeleteTask = async (id, type) => {
    if (!user) {
      console.error("User not authenticated. Cannot delete task.");
      return;
    }

    try {
      await deleteDoc(doc(firestore, "users", user.uid, type === 'assignment' ? "assignments" : "calendarEvents", id));
    } catch (error) {
      console.error(`Error deleting task: `, error);
    }
  };

  const handleAddTask = async (taskData, type) => {
    if (!user) {
      console.error("User not authenticated. Cannot add task.");
      return;
    }

    try {
      await addDoc(collection(firestore, "users", user.uid, type), {
        ...taskData,
        createdAt: new Date()
      });
    } catch (error) {
      console.error(`Error adding task to ${type}: `, error);
    }
  };

  // Render methods remain similar to previous implementation
  return (
    <div
      className={`flex-1 bg-gray-800 p-6 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "ml-64" : "ml-20"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#f06937]">
          Welcome, {user?.displayName || user?.email || "User"}!
        </h1>
        <p className="text-gray-400">{currentDate}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What's Due Section */}
        <ContentCard
          title="What's Due"
          content={
            <TaskList
              tasks={whatsDue}
              onDeleteTask={(id, type) => handleDeleteTask(id, type)}
            />
          }
        />

        {/* Upcoming Section */}
        <ContentCard
          title="Upcoming"
          content={
            <TaskList
              tasks={sortedUpcomingEvents}
              onDeleteTask={(id, type) => handleDeleteTask(id, type)}
            />
          }
        />

        {/* Calendar Section - Similar to previous implementation */}
        <ContentCard
          title="Calendar"
          content={
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents.map(event => ({
                title: event.title,
                start: event.start,
                allDay: event.allDay
              }))}
              height="auto"
            />
          }
        />
      </div>
    </div>
  );
};

// Utility components remain the same
const ContentCard = ({ title, content }) => (
  <div className="bg-gray-900 p-5 rounded-lg shadow">
    <h2 className="text-xl text-white mb-4">{title}</h2>
    {content}
  </div>
);

const TaskList = ({ tasks, onDeleteTask }) => (
  <ul>
    {tasks.map((task) => (
      <li
        key={task.id}
        className="flex justify-between bg-gray-800 p-2 rounded mb-2"
      >
        <div className="flex flex-col">
          <span className="text-white">
            {task.title || task.content}
          </span>
          <span className="text-sm text-gray-400">
            {new Date(task.date || task.dueDate || task.start).toLocaleDateString()}
          </span>
        </div>
        <button
          onClick={() => onDeleteTask(task.id, task.type)}
          className="text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </li>
    ))}
  </ul>
);

export default DashboardContent;