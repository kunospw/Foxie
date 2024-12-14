import React, { useEffect, useState } from "react";
import { firestore } from "../firebase";
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

const DashboardContent = ({ isSidebarExpanded, user }) => {
  const [whatsDue, setWhatsDue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ type: "", collectionName: "" });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);

  useEffect(() => {
    const today = new Date();
    setCurrentDate(today.toLocaleDateString("en-US", { dateStyle: "full" }));

    const whatsDueQuery = query(collection(firestore, "whatsDue"), orderBy("createdAt", "asc"));
    const upcomingQuery = query(collection(firestore, "upcoming"), orderBy("createdAt", "asc"));
    const calendarEventsQuery = query(collection(firestore, "calendarEvents"), orderBy("start", "asc"));

    const unsubscribeWhatsDue = onSnapshot(whatsDueQuery, (snapshot) => {
      setWhatsDue(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeUpcoming = onSnapshot(upcomingQuery, (snapshot) => {
      setUpcoming(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeCalendarEvents = onSnapshot(calendarEventsQuery, (snapshot) => {
      setCalendarEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeWhatsDue();
      unsubscribeUpcoming();
      unsubscribeCalendarEvents();
    };
  }, []);

  const handleAddCalendarEvent = async (eventTitle) => {
    if (!user || !user.uid) {
      console.error("User not authenticated. Cannot add event.");
      return;
    }

    if (!selectedDate) {
      console.error("No date selected.");
      return;
    }

    try {
      await addDoc(collection(firestore, "calendarEvents"), {
        title: eventTitle,
        start: new Date(selectedDate),
        allDay: true,
        userId: user.uid, // Ensure user.uid exists
      });
      setSelectedDate(null);
    } catch (error) {
      console.error("Error adding event: ", error);
    }
  };

  const handleDeleteTask = async (id, collectionName) => {
    try {
      await deleteDoc(doc(firestore, collectionName, id));
    } catch (error) {
      console.error(`Error deleting task from ${collectionName}: `, error);
    }
  };

  const handleDateClick = (info) => {
    setSelectedDate(info.dateStr);
    const eventsOnDate = calendarEvents.filter(
      (event) =>
        new Date(event.start).toISOString().split("T")[0] === info.dateStr
    );
    setSelectedDateEvents(eventsOnDate);
  };

  const openModal = (type, collectionName) => {
    setModalData({ type, collectionName });
    setModalOpen(true);
  };

  return (
    <div
      className={`flex-1 bg-gray-800 p-6 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "ml-64" : "ml-20"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#f06937]">
          Welcome, {user?.displayName || "User"}!
        </h1>
        <p className="text-gray-400">{currentDate}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* What's Due Section */}
        <ContentCard
          title="What's Due"
          content={
            <>
              <TaskList
                tasks={whatsDue}
                onDeleteTask={(id) => handleDeleteTask(id, "whatsDue")}
              />
              <button
                onClick={() => openModal("Add Task", "whatsDue")}
                className="bg-[#f06937] text-white py-2 px-4 rounded-lg hover:bg-opacity-90"
              >
                Add New Task
              </button>
            </>
          }
        />

        {/* Upcoming Section */}
        <ContentCard
          title="Upcoming"
          content={
            <>
              <TaskList
                tasks={upcoming}
                onDeleteTask={(id) => handleDeleteTask(id, "upcoming")}
              />
              <button
                onClick={() => openModal("Add Task", "upcoming")}
                className="bg-[#f06937] text-white py-2 px-4 rounded-lg hover:bg-opacity-90"
              >
                Add New Task
              </button>
            </>
          }
        />

        {/* Calendar Section */}
        <ContentCard
          title="Calendar"
          content={
            <>
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={calendarEvents}
                dateClick={handleDateClick}
                height="auto"
              />
              {selectedDate && (
                <div className="mt-4 bg-gray-900 p-4 rounded-lg">
                  <h3 className="text-lg text-white mb-2">
                    Events on {selectedDate}
                  </h3>
                  {selectedDateEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex justify-between bg-gray-800 p-2 rounded"
                    >
                      <span className="text-white">{event.title}</span>
                      <button
                        onClick={() => handleDeleteTask(event.id, "calendarEvents")}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    placeholder="Add Event Title"
                    className="w-full mt-2 p-2 bg-gray-800 text-white rounded"
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && e.target.value.trim()) {
                        handleAddCalendarEvent(e.target.value.trim());
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              )}
            </>
          }
        />
      </div>

      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={(task) => {
            handleAddTask(task, modalData.collectionName);
            setModalOpen(false);
          }}
          title={modalData.type}
        />
      )}
    </div>
  );
};

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
        <span className="text-white">{task.content || task.title}</span>
        <button
          onClick={() => onDeleteTask(task.id)}
          className="text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </li>
    ))}
  </ul>
);

export default DashboardContent;
