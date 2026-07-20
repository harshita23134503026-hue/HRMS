import React, { useState } from 'react';
import Nember from '../components/Nember/Nember';
import OrgChart from '../components/Nember/orgchart'; // your new file

const Team = () => {
  const [view, setView] = useState("card"); // "card" or "org"

  return (
    <div className="p-4">
      
      {/* Top Toggle Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-semibold p-4">Team Members</h2>
        <button
          onClick={() => setView(view === "card" ? "org" : "card")}
          className="px-4 py-2 border rounded-full"
        >
          {view === "card" ? "Org Chart View" : "Card View"}
        </button>
      </div>

      {/* Conditional Rendering */}
      {view === "card" ? <Nember /> : <OrgChart />}

    </div>
  );
};

export default Team;