import React from "react";
import { Hourglass, Clock } from "lucide-react"; // Using lucide-react icons

export default function WaitingForApproval() {
  return (
    <div className="w-full h-screen bg-gray-100 flex justify-center items-center">
      <div className="bg-white w-[340px] md:w-[400px] rounded-2xl shadow-md p-8 flex flex-col items-center text-center">

        {/* Icon Container */}
        <div className="relative flex items-center justify-center mb-4">
          <Hourglass className="w-16 h-16 text-gray-400" />
          <Clock className="w-10 h-10 text-blue-500 absolute right-0 bottom-0 translate-x-1 translate-y-1" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-semibold text-gray-800">
          Waiting for Approval
        </h2>

        {/* Sub-text */}
        <p className="text-sm text-gray-500 mt-1">
          Once approved you will be notified
        </p>
      </div>
    </div>
  );
}