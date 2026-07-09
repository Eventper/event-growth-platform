import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SimpleEditor() {
  const [clientText, setClientText] = useState("Access My Event");
  const [plannerText, setPlannerText] = useState("Open Dashboard");
  const [sectionTitle, setSectionTitle] = useState("Already working with Event Perfekt?");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">Simple Login Editor</h1>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Edit Login Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-white block mb-2">Section Title</label>
              <Input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white block mb-2">Client Button Text</label>
                <Input
                  value={clientText}
                  onChange={(e) => setClientText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              
              <div>
                <label className="text-white block mb-2">Planner Button Text</label>
                <Input
                  value={plannerText}
                  onChange={(e) => setPlannerText(e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            </div>
            
            <Button 
              onClick={() => {
                console.log('Settings saved:', { sectionTitle, clientText, plannerText });
                alert('Settings saved! Check console for details.');
              }}
              className="w-full bg-green-600"
            >
              Save Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/30 p-8">
              <h3 className="text-white font-bold text-2xl mb-6 text-center">{sectionTitle}</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/90 p-6 rounded-lg text-center">
                  <h4 className="text-burgundy-800 font-bold text-xl mb-3">Client Portal</h4>
                  <p className="text-gray-700 mb-4">Track your event progress and communicate with your planner</p>
                  <div className="bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold">
                    {clientText}
                  </div>
                </div>
                
                <div className="bg-white/90 p-6 rounded-lg text-center">
                  <h4 className="text-burgundy-800 font-bold text-xl mb-3">Planner Suite</h4>
                  <p className="text-gray-700 mb-4">Manage events and access professional tools</p>
                  <div className="bg-[#8B1538] text-white px-6 py-3 rounded-lg font-semibold">
                    {plannerText}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}