import React, { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Loader2, Upload, Trash2, RefreshCw } from "lucide-react";
import Swal from 'sweetalert2';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_UPLOAD_PRESET;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file) => {
  if (!file) return "Please select a file";
  
  if (file.size > MAX_FILE_SIZE) {
    return "File size exceeds 10MB limit";
  }

  const allowedTypes = {
    'application/pdf': 'raw',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/jpg': 'image',
    'application/msword': 'raw',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'raw'
  };

  if (!allowedTypes[file.type]) {
    return "Invalid file type. Please upload PDF, Word, or image files";
  }

  return null;
};

const getUploadUrl = (fileType) => {
  const resourceType = {
    'application/pdf': 'raw',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/jpg': 'image',
    'application/msword': 'raw',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'raw'
  }[fileType] || 'image';

  return `${CLOUDINARY_UPLOAD_URL}/${resourceType}/upload`;
};

const Notes = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [file, setFile] = useState(null);
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const coursesQuery = collection(firestore, "users", user.uid, "courses");
        const notesQuery = collection(firestore, "users", user.uid, "notes");

        const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
          const fetchedCourses = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCourses(fetchedCourses);
        });

        const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
          const fetchedNotes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })).sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate());
          setNotes(fetchedNotes);
        });

        setIsLoading(false);

        return () => {
          unsubscribeCourses();
          unsubscribeNotes();
        };
      } catch (err) {
        console.error("Error fetching data:", err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load your notes. Please refresh the page.'
        });
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleFileUpload = async () => {
    if (!user) return;

    const fileError = validateFile(file);
    if (fileError) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: fileError
      });
      return;
    }

    if (!selectedCourse || !noteContent.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please fill in all fields'
      });
      return;
    }

    setIsUploading(true);

    try {
      const selectedCourseName = courses.find(
        (course) => course.id === selectedCourse
      )?.courseName || selectedCourse;

      const folderPath = `notes/${user.uid}/${selectedCourse}`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", folderPath);

      // Get the appropriate upload URL based on file type
      const uploadUrl = getUploadUrl(file.type);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${errorText}`);
      }

      const data = await response.json();

      // Store the resource type explicitly
      const resourceType = file.type === 'application/pdf' || file.type.includes('application/') ? 'raw' : 'image';

      await addDoc(collection(firestore, "users", user.uid, "notes"), {
        courseId: selectedCourse,
        courseName: selectedCourseName,
        content: noteContent.trim(),
        fileUrl: data.secure_url,
        fileName: file.name,
        fileType: file.type,
        publicId: data.public_id,
        resourceType: resourceType,
        createdAt: new Date(),
      });

      setFile(null);
      setNoteContent("");
      setSelectedCourse("");
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Note uploaded successfully',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Upload error details:", err);
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'Failed to upload note. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNoteDelete = async (noteId, publicId, resourceType = 'auto') => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f06937',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('/api/deleteFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publicId, 
          resourceType: resourceType || 'auto' 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete file");
      }

      await deleteDoc(doc(firestore, "users", user.uid, "notes", noteId));

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Your note has been deleted.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Delete error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to delete note. Please try again.'
      });
    }
  };

  const syncNotes = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const response = await fetch('/api/notes/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync notes');
      }

      const result = await response.json();
      
      Swal.fire({
        icon: 'success',
        title: 'Sync Complete',
        text: `Synced: ${result.synced}, Removed: ${result.removed}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error("Sync error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Sync Failed',
        text: 'Failed to sync notes. Please try again.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-800">
        <Loader2 className="w-8 h-8 text-[#f06937] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#f06937]">Notes</h1>
          <button
            onClick={syncNotes}
            disabled={isSyncing}
            className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync Notes
          </button>
        </div>

        <div className="bg-gray-900 p-6 rounded-lg mb-6">
          <h2 className="text-xl text-white mb-4">Add a New Note</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-[#f06937] focus:ring-1 focus:ring-[#f06937] outline-none"
              disabled={isUploading}
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName}
                </option>
              ))}
            </select>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a description..."
              className="p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-[#f06937] focus:ring-1 focus:ring-[#f06937] outline-none resize-none"
              disabled={isUploading}
            />

            <div className="relative">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 p-2 bg-gray-700 text-white rounded cursor-pointer hover:bg-gray-600"
              >
                <Upload className="w-4 h-4" />
                {file ? file.name : "Choose File"}
              </label>
            </div>

            <button
              onClick={handleFileUpload}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 p-2 bg-[#f06937] text-white rounded hover:bg-[#e5582f] disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Upload Note"
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {courses.map((course) => {
            const courseNotes = notes.filter(
              (note) => note.courseId === course.id
            );

            if (courseNotes.length === 0) return null;

            return (
              <div key={course.id} className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-xl text-[#f06937] mb-4">
                  {course.courseName}
                </h3>
                <div className="space-y-3">
                  {courseNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex justify-between items-start p-3 bg-gray-800 rounded"
                    >
                      <div className="space-y-2">
                        <p className="text-white">{note.content}</p>
                        <a
                          href={note.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#f06937] hover:underline inline-flex items-center gap-2"
                        >
                          {note.fileName}
                        </a>
                      </div>
                      <button
                        onClick={() => handleNoteDelete(note.id, note.publicId)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Notes;