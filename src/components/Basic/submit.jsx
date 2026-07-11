// /components/Basic/submit.jsx
import React, { useState } from "react";
import { Paperclip, Send } from "lucide-react";

const SubmitPopup = ({ isOpen, onClose, title, taskId, onSubmitTask }) => {
  const [openDescriptionPopup, setOpenDescriptionPopup] = useState(false);
  const [openConfirmPopup, setOpenConfirmPopup] = useState(false);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When parent opens Popup → open first step
  React.useEffect(() => {
    if (isOpen) {
      setOpenDescriptionPopup(true);
    } else {
      setOpenDescriptionPopup(false);
      setOpenConfirmPopup(false);
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmitDescription = () => {
    if (!description.trim()) return;
    setOpenDescriptionPopup(false);
    setOpenConfirmPopup(true);
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Call the callback to submit the task
      if (onSubmitTask && taskId) {
        await onSubmitTask(taskId, description);
      }
      setOpenConfirmPopup(false);
      onClose(); // close whole popup
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ----------------------------------------------------------- */}
      {/* FIRST POPUP - DESCRIPTION BOX */}
      {/* ----------------------------------------------------------- */}
      {openDescriptionPopup && (
  <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
    <div className="bg-white w-[350px] rounded-2xl shadow-xl p-4 relative">

      <h2 className="text-lg font-semibold mb-2">{title}</h2>

      <textarea
        className="w-full h-28 border border-blue-300 rounded-2xl p-3 outline-none resize-none"
        placeholder="Enter description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Bottom Section */}
      <div className="flex justify-between mt-3 items-center">

        {/* CANCEL BUTTON (left side) */}
        <button
          onClick={() => { setOpenDescriptionPopup(false); onClose(); }}
          className="px-4 py-1 rounded-full border border-gray-300 text-gray-600 text-sm"
        >
          Cancel
        </button>

        {/* Attach + Send Button (right side) */}
        <div className="flex items-center gap-3">
          <Paperclip className="text-gray-500 cursor-pointer" />

          <button
            onClick={handleSubmitDescription}
            className="text-blue-500"
          >
            <Send size={24} />
          </button>
        </div>

      </div>
    </div>
  </div>
)}

      {/* ----------------------------------------------------------- */}
      {/* SECOND POPUP - CONFIRMATION BOX */}
      {/* ----------------------------------------------------------- */}
      {openConfirmPopup && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
          <div className="bg-white w-[300px] rounded-2xl shadow-xl p-6 text-center">

            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-full border border-blue-500 text-blue-500 flex items-center justify-center text-xl">
                i
              </div>
            </div>

            <h2 className="text-xl font-semibold">Are you sure?</h2>
            <p className="text-gray-500 text-sm mt-1">
              You really want to submit?
            </p>

            <div className="flex justify-between mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-600"
              >
                Cancel
              </button>

              <button
                onClick={handleFinalConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-full bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubmitPopup;