import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const projects = [
  { id: 1, title: "Weather App", embedUrl: "https://weather-app-demo.com" },
  { id: 2, title: "To-Do List", embedUrl: "https://todo-list-demo.com" },
  { id: 3, title: "Chat Application", embedUrl: "https://chat-app-demo.com" },
];

export default function Portfolio() {
  const [selectedProject, setSelectedProject] = useState(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-10 flex flex-col items-center">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold">John Doe</h1>
        <p className="text-lg text-gray-400">Full-Stack Developer</p>
      </section>

      {/* Projects Section */}
      <section className="w-full max-w-4xl">
        <h2 className="text-2xl font-semibold mb-4">Past Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="p-4 bg-gray-800 hover:bg-gray-700 cursor-pointer"
              onClick={() => setSelectedProject(project)}
            >
              <CardContent className="text-center">
                <h3 className="text-lg font-semibold">{project.title}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Project Mini-Screen */}
      {selectedProject && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg relative w-3/4 h-3/4">
            <button
              className="absolute top-2 right-2 text-white"
              onClick={() => setSelectedProject(null)}
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4">{selectedProject.title}</h2>
            <iframe
              src={selectedProject.embedUrl}
              title={selectedProject.title}
              className="w-full h-full border-none rounded-md"
            ></iframe>
          </div>
        </motion.div>
      )}
    </div>
  );
}
