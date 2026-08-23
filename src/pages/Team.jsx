import React, { useState } from 'react';
import Nember from '../components/Nember/Nember';
import OrgChart from '../components/Nember/orgchart';

const Team = () => {
  const [view, setView] = useState('card');

  return (
    <div className="p-4">
      {/* Header and Toggle Button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-semibold p-4">
          {view === 'card' ? 'Team Members' : 'Org Chart'}
        </h2>

        <button
          type="button"
          onClick={() =>
            setView((currentView) =>
              currentView === 'card' ? 'org' : 'card'
            )
          }
          className="px-4 py-2 border rounded-full"
        >
          {view === 'card' ? 'Org Chart View' : 'Card View'}
        </button>
      </div>

      {/* Conditional Rendering */}
      {view === 'card' ? <Nember /> : <OrgChart />}
    </div>
  );
};

export default Team;