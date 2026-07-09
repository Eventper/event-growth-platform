import { Calendar, DollarSign, Handshake, CheckCircle } from "lucide-react";

interface StatsOverviewProps {
  stats: {
    activeEvents: number;
    totalBudget: string;
    vendors: number;
    completedTasks: number;
  };
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" style={{color: 'black'}}>
        <div className="flex items-center justify-between" style={{color: 'black'}}>
          <div style={{color: 'black'}}>
            <p className="text-sm font-medium text-contrast-auto" style={{color: 'black'}}>Active Events</p>
            <p className="text-3xl font-bold text-burgundy-800">{stats.activeEvents}</p>
          </div>
          <div className="w-12 h-12 bg-burgundy-50 rounded-lg flex items-center justify-center">
            <Calendar className="text-burgundy-800 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center" style={{color: 'black'}}>
          <span className="text-green-500 text-sm font-medium">+2.5%</span>
          <span className="text-contrast-auto text-sm ml-2" style={{color: 'black'}}>vs last month</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" style={{color: 'black'}}>
        <div className="flex items-center justify-between" style={{color: 'black'}}>
          <div style={{color: 'black'}}>
            <p className="text-sm font-medium text-contrast-auto" style={{color: 'black'}}>Total Budget</p>
            <p className="text-3xl font-bold text-burgundy-800">{stats.totalBudget}</p>
          </div>
          <div className="w-12 h-12 bg-burgundy-50 rounded-lg flex items-center justify-center">
            <DollarSign className="text-burgundy-800 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center" style={{color: 'black'}}>
          <span className="text-green-500 text-sm font-medium">+12.1%</span>
          <span className="text-contrast-auto text-sm ml-2" style={{color: 'black'}}>vs last month</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200" style={{color: 'black'}}>
        <div className="flex items-center justify-between" style={{color: 'black'}}>
          <div style={{color: 'black'}}>
            <p className="text-sm font-medium text-contrast-auto" style={{color: 'black'}}>Vendors</p>
            <p className="text-3xl font-bold text-burgundy-800">{stats.vendors}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Handshake className="text-blue-600 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center" style={{color: 'black'}}>
          <span className="text-green-500 text-sm font-medium">+5.2%</span>
          <span className="text-contrast-auto text-sm ml-2" style={{color: 'black'}}>vs last month</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-contrast-auto">Completed Tasks</p>
            <p className="text-3xl font-bold text-burgundy-800">{stats.completedTasks}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="text-green-600 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className="text-green-500 text-sm font-medium">+8.7%</span>
          <span className="text-contrast-auto text-sm ml-2">vs last month</span>
        </div>
      </div>
    </div>
  );
}
