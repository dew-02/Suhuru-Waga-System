import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ import navigate
import axios from "axios";
import Bfooter from "../Bfooter/Bfooter";
import Bheader from '../Bheader/Bheader';
import "./AddCropForm.css"; // import CSS


function AddCropForm() {
  const navigate = useNavigate(); // ✅ create navigate hook
  

  const [formData, setFormData] = useState({
    crop_name: "",
    category: "",
    price: "",
    quantity_available: "",
    location: "",
    farmer_id: "",
  });
  const [image, setImage] = useState(null);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => setImage(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => data.append(key, formData[key]));
      if (image) data.append("image", image);

      await axios.post("http://localhost:5000/cropsFB/add", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Crop added successfully!");

      // ✅ reset form
      setFormData({
        crop_name: "",
        category: "",
        price: "",
        quantity_available: "",
        location: "",
        farmer_id: "",
      });
      setImage(null);

      // ✅ navigate to crop ads page
      navigate("/cropads"); 
    } catch (err) {
      console.error(err);
      alert("Failed to add crop");
    }
  };

  return (
    <div className="bycfadd-page">
      <Bheader />
 
      <div className="bycfadd-crop-container">
        <h2>Add Crop Advertisement</h2>
        <form onSubmit={handleSubmit}>
          <label>Crop Name</label>
          <input type="text" name="crop_name" value={formData.crop_name}  onChange={handleChange} required/>
          <label>Category</label>
          <input type="text" name="category" value={formData.category} onChange={handleChange} required />
          <label>Price (Per 1kg)</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
          <label>Available Quantity (kg)</label>
          <input
            type="number"
            name="quantity_available"
            value={formData.quantity_available}
            onChange={handleChange}
            required
          />

          <label>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />

          <label>Farmer Phone Number</label>
          <input
            type="text"
            name="farmer_id"
            value={formData.farmer_id}
            onChange={handleChange}
            required
          />

          <label>Image</label>
          <input
            type="file"
            name="image"
            onChange={handleImageChange}
            accept="image/*"
          />

          <button type="submit">Add Crop</button>
        </form>
      </div>
      <Bfooter />
    </div>
  );
}

export default AddCropForm;