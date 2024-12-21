import React, { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";

const Courses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  useEffect(() => {
    if (!user) return;

    // Fetch courses in real-time
    const coursesQuery = collection(firestore, "users", user.uid, "courses");
    const unsubscribe = onSnapshot(coursesQuery, (snapshot) => {
      setCourses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddCourse = async () => {
    if (!courseName) {
      alert("Course name is required!");
      return;
    }

    await addDoc(collection(firestore, "users", user.uid, "courses"), {
      courseName,
      courseDescription,
      createdAt: new Date(),
    });

    setCourseName("");
    setCourseDescription("");
    alert("Course added successfully!");
  };

  const handleDeleteCourse = async (courseId) => {
    const confirmation = window.confirm("Are you sure you want to delete this course?");
    if (confirmation) {
      await deleteDoc(doc(firestore, "users", user.uid, "courses", courseId));
      alert("Course deleted successfully!");
    }
  };

  return (
    <div className="p-6 bg-gray-800 min-h-screen">
      <h1 className="text-3xl font-bold text-[#f06937] mb-6">Courses</h1>

      {/* Add New Course Section */}
      <div className="bg-gray-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl text-white mb-4">Add a New Course</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Course Name"
            className="p-2 rounded bg-gray-700 text-white"
          />
          <textarea
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            placeholder="Course Description (optional)"
            className="p-2 rounded bg-gray-700 text-white"
          />
          <button
            onClick={handleAddCourse}
            className="p-2 bg-[#f06937] text-white rounded hover:bg-[#e5582f]"
          >
            Add Course
          </button>
        </div>
      </div>

      {/* List of Courses */}
      <div>
        {courses.map((course) => (
          <div key={course.id} className="bg-gray-900 p-4 rounded-lg mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-xl text-[#f06937]">{course.courseName}</h3>
              <p className="text-gray-400">{course.courseDescription || "No description provided."}</p>
            </div>
            <button
              onClick={() => handleDeleteCourse(course.id)}
              className="text-red-500 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Courses;
