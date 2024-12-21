import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";

const ASSIGNMENT_STATUS = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress", 
  DONE: "Done",
  QUIZ_EXAM: "Quiz/Exam"
};

const Assignments = ({ isSidebarExpanded }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    dueDate: "",
    courseId: "",
    courseName: "",
    status: ASSIGNMENT_STATUS.NOT_STARTED
  });

  useEffect(() => {
    if (!user) return;

    // Fetch Assignments
    const assignmentsQuery = collection(firestore, "users", user.uid, "assignments");
    const assignmentsUnsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      const fetchedAssignments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssignments(fetchedAssignments);
    });

    // Fetch Courses
    const coursesQuery = collection(firestore, "users", user.uid, "courses");
    const coursesUnsubscribe = onSnapshot(coursesQuery, (snapshot) => {
      const fetchedCourses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(fetchedCourses);
    });

    return () => {
      assignmentsUnsubscribe();
      coursesUnsubscribe();
    };
  }, [user]);

  const handleAddAssignment = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Find the full course details
    const selectedCourse = courses.find(course => course.id === newAssignment.courseId);

    try {
      const assignmentsRef = collection(firestore, "users", user.uid, "assignments");
      await addDoc(assignmentsRef, {
        ...newAssignment,
        courseName: selectedCourse.courseName,
        createdAt: new Date()
      });

      // Reset form
      setNewAssignment({
        title: "",
        dueDate: "",
        courseId: "",
        courseName: "",
        status: ASSIGNMENT_STATUS.NOT_STARTED
      });
    } catch (error) {
      console.error("Error adding assignment:", error);
    }
  };

  const handleUpdateAssignment = async (id, updatedFields) => {
    if (!user) return;

    try {
      const assignmentRef = doc(firestore, "users", user.uid, "assignments", id);
      await updateDoc(assignmentRef, updatedFields);
    } catch (error) {
      console.error("Error updating assignment:", error);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!user) return;

    try {
      const assignmentRef = doc(firestore, "users", user.uid, "assignments", id);
      await deleteDoc(assignmentRef);
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case ASSIGNMENT_STATUS.NOT_STARTED:
        return "bg-red-500";
      case ASSIGNMENT_STATUS.IN_PROGRESS:
        return "bg-yellow-500";
      case ASSIGNMENT_STATUS.DONE:
        return "bg-green-500";
      case ASSIGNMENT_STATUS.QUIZ_EXAM:
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div
      className={`flex-1 bg-gray-800 p-6 transition-all duration-300 ease-in-out ${
        isSidebarExpanded ? "ml-64" : "ml-20"
      }`}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f06937]">Assignment Tracker</h1>
      </div>

      {/* Add Assignment Form */}
      <div className="bg-gray-900 p-5 rounded-lg mb-6">
        <h2 className="text-xl text-white mb-4">Add New Assignment</h2>
        <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Assignment Title"
            value={newAssignment.title}
            onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
            required
          />
          <select
            value={newAssignment.courseId}
            onChange={(e) => setNewAssignment({...newAssignment, courseId: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
            required
          >
            <option value="">Select Course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.courseName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newAssignment.dueDate}
            onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
            required
          />
          <select
            value={newAssignment.status}
            onChange={(e) => setNewAssignment({...newAssignment, status: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
          >
            {Object.values(ASSIGNMENT_STATUS).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-[#f06937] text-white p-2 rounded md:col-span-2 hover:bg-[#d0542d] transition"
          >
            Add Assignment
          </button>
        </form>
      </div>

      {/* Assignments List */}
      <div className="bg-gray-900 p-5 rounded-lg">
        <h2 className="text-xl text-white mb-4">Your Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-gray-400">No assignments yet. Add your first assignment!</p>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <div 
                key={assignment.id} 
                className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
              >
                <div className="flex items-center space-x-4">
                  <div 
                    className={`h-4 w-4 rounded-full ${getStatusColor(assignment.status)}`}
                  />
                  <div>
                    <h3 className="text-white font-semibold">{assignment.title}</h3>
                    <p className="text-gray-400">
                      {assignment.courseName} - Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <select
                    value={assignment.status}
                    onChange={(e) => handleUpdateAssignment(assignment.id, { status: e.target.value })}
                    className="bg-gray-700 text-white p-1 rounded text-sm"
                  >
                    {Object.values(ASSIGNMENT_STATUS).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Assignments;