import React, { useState, useEffect } from "react";
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Loader2, Upload, Trash2, RefreshCw } from "lucide-react";
import Swal from 'sweetalert2';

const getCloudinaryConfig = () => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    console.error('Missing Cloudinary configuration:', {
      cloudName: !!cloudName,
      uploadPreset: !!uploadPreset
    });
    throw new Error('Missing Cloudinary configuration. Please check your environment variables.');
  }
  
  return {
    cloudName,
    uploadPreset,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}`
  };
};

// Verify Cloudinary configuration on component mount
const verifyCloudinaryConfig = () => {
  try {
    return getCloudinaryConfig();
  } catch (error) {
    console.error('Cloudinary configuration verification failed:', error);
    return null;
  }
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
  const [isCloudinaryConfigured, setIsCloudinaryConfigured] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    const config = verifyCloudinaryConfig();
    setIsCloudinaryConfigured(!!config);
    
    if (!config) {
      Swal.fire({
        icon: 'error',
        title: 'Configuration Error',
        text: 'The upload functionality is currently unavailable. Please contact support.',
        showConfirmButton: true
      });
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

    if (!isCloudinaryConfigured) {
      Swal.fire({
        icon: 'error',
        title: 'Upload Unavailable',
        text: 'File upload is currently unavailable. Please contact support.'
      });
      return;
    }

    const fileError = validateFile(file);
    if (fileError) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: fileError
      });
      return;
    }

    setIsUploading(true);

    try {
      const config = getCloudinaryConfig();
      
      if (!config) {
        throw new Error('Failed to get Cloudinary configuration');
      }

      const selectedCourseName = courses.find(
        (course) => course.id === selectedCourse
      )?.courseName || selectedCourse;

      const folderPath = `notes/${user.uid}/${selectedCourse}`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("folder", folderPath);

      const uploadUrl = `${config.uploadUrl}/${file.type.includes('application/') ? 'raw' : 'image'}/upload`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();

      await addDoc(collection(firestore, "users", user.uid, "notes"), {
        courseId: selectedCourse,
        courseName: selectedCourseName,
        content: noteContent.trim(),
        fileUrl: data.secure_url,
        fileName: file.name,
        fileType: file.type,
        publicId: data.public_id,
        resourceType: file.type.includes('application/') ? 'raw' : 'image',
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
      
      // More specific error messages based on the error type
      let errorMessage = 'Failed to upload note. Please try again.';
      if (err.message.includes('configuration')) {
        errorMessage = 'Upload service is not properly configured. Please contact support.';
      } else if (err.message.includes('Upload failed')) {
        errorMessage = 'File upload failed. Please try again or use a different file.';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: errorMessage
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