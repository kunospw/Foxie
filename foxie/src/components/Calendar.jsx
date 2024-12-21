import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Modal from "./Modal";

const Calendar = () => {
  const { user } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [eventData, setEventData] = useState({
    title: "",
    start: "",
    allDay: false,
  });

  useEffect(() => {
    if (!user) return;

    const calendarEventsQuery = collection(firestore, "users", user.uid, "calendarEvents");
    const unsubscribe = onSnapshot(calendarEventsQuery, (snapshot) => {
      setCalendarEvents(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, [user]);

  const handleDateClick = (arg) => {
    setEventData({ ...eventData, start: arg.dateStr, allDay: true });
    setModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!user || !eventData.title || !eventData.start) return;

    try {
      await addDoc(collection(firestore, "users", user.uid, "calendarEvents"), {
        ...eventData,
        createdAt: new Date(),
      });
      setModalOpen(false);
      setEventData({ title: "", start: "", allDay: false });
    } catch (error) {
      console.error("Error saving event: ", error);
    }
  };

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h1 className="text-2xl font-bold text-[#f06937] mb-4">My Calendar</h1>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents.map((event) => ({
          title: event.title,
          start: event.start,
          allDay: event.allDay,
        }))}
        dateClick={handleDateClick}
        height="auto"
      />
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEvent}
        title="Add New Event"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Event Title"
            value={eventData.title}
            onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-[#f06937]"
          />
          <input
            type="date"
            value={eventData.start}
            onChange={(e) => setEventData({ ...eventData, start: e.target.value })}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-[#f06937]"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={eventData.allDay}
              onChange={(e) => setEventData({ ...eventData, allDay: e.target.checked })}
              className="form-checkbox text-[#f06937]"
            />
            <span className="text-white">All Day</span>
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
