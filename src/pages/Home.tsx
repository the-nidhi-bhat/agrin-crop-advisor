import React, { useState, useRef } from "react";
import { Camera, Upload, MapPin, Leaf, Phone } from "lucide-react";
import { ref, uploadBytes } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { storage, functions } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { StagedLoader } from "../components/StagedLoader";

export const Home = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState<string>("Tomato");
  const [location, setLocation] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return setError("User not authenticated.");
    if (!file) return setError("Please select or take a photo of the crop.");
    if (!phone) return setError("Please enter your phone number.");

    setLoadingStep(0);
    setError(null);

    try {
      // 1. Upload Photo
      const fileId = crypto.randomUUID();
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `uploads/${user.uid}/${fileId}.${ext}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      // Wait, passing the full path so the backend can verify IDOR
      
      setLoadingStep(1); // Analyzing...

      // 2. Call backend function (Diagnosis)
      const diagnoseFn = httpsCallable(functions, "diagnose");
      const diagnosisResponse = await diagnoseFn({
        imageUrl: storagePath,
        crop,
        location,
        phoneNumber: phone
      });
      const diagnosisData: any = diagnosisResponse.data;

      setLoadingStep(2); // Fetching local advice...

      // 3. Call backend function (Advisory)
      const advisoryFn = httpsCallable(functions, "advisory");
      const advisoryResponse = await advisoryFn({
        diagnosisId: diagnosisData.id
      });
      const advisoryData: any = advisoryResponse.data;

      setLoadingStep(3); // Generating audio / Done...
      
      // 4. Call backend function (Deliver)
      const deliverFn = httpsCallable(functions, "deliver");
      const deliverResponse = await deliverFn({
        diagnosisId: diagnosisData.id
      });
      const deliverData: any = deliverResponse.data;

      setResult({
        ...diagnosisData,
        advisory: advisoryData.advisory,
        weather: advisoryData.weather,
        translatedAdvisory: deliverData.translatedAdvisory,
        smsStatus: deliverData.smsStatus
      });
      setLoadingStep(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during diagnosis.");
      setLoadingStep(null);
    }
  };

  if (loadingStep !== null) {
    return <StagedLoader currentStep={loadingStep} />;
  }

  if (result) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Diagnosis Ready</h2>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 shadow-sm">
          <h3 className="text-xl font-bold text-green-900">{result.disease}</h3>
          <p className="text-sm text-green-700 mt-1">Confidence: {result.confidence}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          <h4 className="font-bold text-gray-700">Symptoms</h4>
          <p className="text-gray-600">{result.symptoms}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
          <h4 className="font-bold text-gray-700">Advisory</h4>
          <p className="text-gray-600">{result.advisory}</p>
        </div>

        {/* Translation and Audio Section */}
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-4 space-y-3">
          <h4 className="font-bold text-blue-900">Translation (Kannada)</h4>
          <p className="text-blue-800">{result.translatedAdvisory}</p>
          
          <div className="pt-2">
             <button 
               onClick={() => {
                 window.speechSynthesis.cancel(); // Stop any currently playing audio
                 const utterance = new SpeechSynthesisUtterance(result.translatedAdvisory);
                 utterance.lang = 'kn-IN';
                 window.speechSynthesis.speak(utterance);
               }}
               className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center space-x-2 transition-colors"
             >
               <span className="text-xl">🔊</span>
               <span>Play Audio (Kannada)</span>
             </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-green-700 bg-green-50 p-3 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center">✓</div>
          <span className="font-medium">SMS Sent to {result.smsStatus?.to || phone}</span>
        </div>

        <button 
          onClick={() => { setResult(null); setFile(null); setPreview(null); }}
          className="w-full py-4 bg-gray-200 text-gray-800 font-bold rounded-xl text-lg mt-4"
        >
          New Diagnosis
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="text-center mb-8 mt-4">
        <h1 className="text-3xl font-bold text-green-800">AgriN</h1>
        <p className="text-gray-600 mt-2 text-lg">Crop Advisor</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-64 border-4 border-dashed border-green-300 rounded-2xl flex flex-col items-center justify-center bg-green-50 text-green-800 cursor-pointer overflow-hidden relative"
        >
          {preview ? (
            <img src={preview} alt="Crop preview" className="w-full h-full object-cover" />
          ) : (
            <>
              <Camera size={64} className="mb-4 opacity-80" />
              <span className="text-2xl font-bold">Take Photo</span>
              <span className="text-sm mt-2 opacity-70">Tap to open camera</span>
            </>
          )}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
          />
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div className="flex items-center bg-white p-2 rounded-xl border shadow-sm">
            <Leaf className="text-green-600 mx-3" size={28} />
            <select 
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full p-3 text-lg bg-transparent outline-none appearance-none"
            >
              <option value="Tomato">Tomato</option>
              <option value="Chili">Chili</option>
              <option value="Paddy">Paddy</option>
            </select>
          </div>

          <div className="flex items-center bg-white p-2 rounded-xl border shadow-sm">
            <MapPin className="text-blue-600 mx-3" size={28} />
            <input 
              type="text" 
              placeholder="Location (e.g. Karnataka)" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 text-lg bg-transparent outline-none"
            />
          </div>

          <div className="flex items-center bg-white p-2 rounded-xl border shadow-sm">
            <Phone className="text-gray-600 mx-3" size={28} />
            <input 
              type="tel" 
              placeholder="Phone Number (for SMS)" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 text-lg bg-transparent outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-xl border border-red-200 text-center font-medium">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          className="w-full py-5 bg-green-700 text-white font-bold rounded-xl text-2xl shadow-lg active:scale-95 transition-transform"
        >
          Diagnose Now
        </button>
      </form>
    </div>
  );
};
