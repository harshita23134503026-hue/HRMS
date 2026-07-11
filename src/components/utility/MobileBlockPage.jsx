import { MonitorX } from "lucide-react";

const MobileBlockPage = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center text-center bg-gray-100 px-6">
      <MonitorX className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Desktop Only Feature
      </h1>
      <p className="text-gray-600 text-sm">
        The dashboard is only available on medium and larger screens.
        <br />
        Please switch to a tablet or desktop device to continue.
      </p>
    </div>
  );
};

export default MobileBlockPage;
