"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Printer } from "lucide-react";

export default function PayrollSummaryPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [empInfo, setEmpInfo] = useState<any>(null);
  const [filters, setFilters] = useState({
    start: "",
    end: "",
    area: "",
    areaCode: "",
    empId: "",
  });

  const handleFetch = async () => {
    setLoading(true);
    // 1. หาข้อมูลพนักงานจาก employee_id
    const { data: user } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("employee_id", filters.empId)
      .single();
    if (user) {
      setEmpInfo(user);
      // 2. ดึง Attendance ที่มี Filter ครบ
      let query = supabase
        .from("attendance_logs")
        .select("*")
        .eq("username", user.username);
      if (filters.start)
        query = query.gte("created_at", `${filters.start}T00:00:00`);
      if (filters.end)
        query = query.lte("created_at", `${filters.end}T23:59:59`);
      if (filters.area) query = query.eq("store_area", filters.area);

      const { data: logs } = await query.order("created_at", {
        ascending: true,
      });
      setData(logs || []);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* ส่วน Filter */}
      <div className="bg-white p-6 rounded shadow mb-6 print:hidden">
        <div className="grid grid-cols-5 gap-3 text-xs">
          <input
            type="date"
            className="border p-2"
            onChange={(e) => setFilters({ ...filters, start: e.target.value })}
          />
          <input
            type="date"
            className="border p-2"
            onChange={(e) => setFilters({ ...filters, end: e.target.value })}
          />
          <input
            type="text"
            placeholder="Area"
            className="border p-2"
            onChange={(e) => setFilters({ ...filters, area: e.target.value })}
          />
          <input
            type="text"
            placeholder="Employee ID"
            className="border p-2"
            onChange={(e) => setFilters({ ...filters, empId: e.target.value })}
          />
          <button
            onClick={handleFetch}
            className="bg-blue-600 text-white rounded"
          >
            <Search className="inline w-4" /> ดึงข้อมูล
          </button>
        </div>
      </div>

      {/* เอกสารสรุป (Print View) */}
      {empInfo && (
        <div className="max-w-[210mm] mx-auto bg-white p-10 shadow-lg print:shadow-none">
          <div className="flex items-center gap-4 mb-6 border-b pb-4">
            <img src="/rvp.png" alt="logo" className="w-16" />
            <h1 className="font-bold text-xl">
              บริษัท ริเวอร์โปร อินเตอร์เทรด จำกัด
            </h1>
          </div>

          <h2 className="text-center font-bold text-lg mb-4">
            เอกสารใบปะหน้าค่าใช้จ่าย
          </h2>

          <div className="grid grid-cols-2 text-sm mb-6 border p-4 bg-gray-50">
            <p>
              ชื่อพนักงาน: <b>{empInfo.display_name}</b>
            </p>
            <p>
              รหัสพนักงาน: <b>{empInfo.employee_id}</b>
            </p>
            <p>
              เขต (Area): <b>{filters.area || "-"}</b>
            </p>
            <p>
              ประเภทการจ้าง: <b>รายวัน</b>
            </p>
          </div>

          <table className="w-full border-collapse border border-black mb-6 text-[10px]">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-1">วันที่</th>
                <th className="border p-1">ร้านค้า</th>
                <th className="border p-1">เวลาเข้า</th>
                <th className="border p-1">เวลาออก</th>
                <th className="border p-1">ค่าเดินทาง</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="border p-1 text-center">
                    {new Date(row.created_at).toLocaleDateString("th-TH")}
                  </td>
                  <td className="border p-1">{row.store_name}</td>
                  <td className="border p-1 text-center">
                    {new Date(row.created_at).toLocaleTimeString("th-TH")}
                  </td>
                  <td className="border p-1 text-center">-</td>
                  <td className="border p-1 text-right">
                    {row.travel_expense || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 gap-10 mt-20 text-center text-sm">
            <div className="border-t border-black">พนักงาน</div>
            <div className="border-t border-black">KOE</div>
            <div className="border-t border-black">Manager</div>
          </div>
          <button
            onClick={() => window.print()}
            className="mt-10 bg-emerald-600 text-white p-2 px-4 rounded print:hidden"
          >
            <Printer className="inline w-4" /> ปริ้นท์
          </button>
        </div>
      )}
    </div>
  );
}
