import React, { useEffect, useState,useRef } from "react";
import { Chart, registerables } from "chart.js";

// ثبت Chart.js
Chart.register(...registerables);

export default function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedType, setSelectedType] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedItem, setSelectedItem] = useState(null);
    const [compareList, setCompareList] = useState([]);

    // بارگیری اولیه
    useEffect(() => {
        const savedData = localStorage.getItem("brsapi_data");
        if (savedData) {
            setData(JSON.parse(savedData));
        }

        fetch("https://brsapi.ir/Api/Market/Gold_Currency.php?key=FreeeqQ8CF5nLclAr2VT7xoiG7AIpQCP")
            .then(res => res.json())
            .then(json => {
                setData(json);
                localStorage.setItem("brsapi_data", JSON.stringify(json));
                setLoading(false);
            })
            .catch(err => {
                setError("خطا در بارگیری داده");
                setLoading(false);
            });

        // به‌روزرسانی خودکار هر 5 دقیقه
        const interval = setInterval(() => {
            fetch(" https://brsapi.ir/Api/Market/Gold_Currency.php?key=FreeeqQ8CF5nLclAr2VT7xoiG7AIpQCP")
                .then(res => res.json())
                .then(json => {
                    setData(json);
                    localStorage.setItem("brsapi_data", JSON.stringify(json));
                });
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // فیلتر داده‌ها
    const getFilteredItems = () => {
        if (!data) return [];

        let items = [];
        if (selectedType === "gold") items = data.gold;
        else if (selectedType === "currency") items = data.currency;
        else if (selectedType === "crypto") items = data.cryptocurrency;
        else items = [...data.gold, ...data.currency, ...data.cryptocurrency];

        return items.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const filteredItems = getFilteredItems();

    // مدیریت جزئیات
    const showDetails = (item) => {
        setSelectedItem(item);
    };

    // اضافه/حذف از لیست مقایسه
    const toggleCompare = (item) => {
        setCompareList(prev => {
            const exists = prev.find(i => i.symbol === item.symbol);
            if (exists) {
                return prev.filter(i => i.symbol !== item.symbol);
            } else {
                return [...prev, item];
            }
        });
    };

    // نمایش نمودار مقایسه
    const renderComparisonChart = () => {
        if (compareList.length < 2) return null;

        const labels = compareList.map(i => i.name);
        const prices = compareList.map(i =>
            typeof i.price === "string" ? parseFloat(i.price) : i.price
        );

        // Create a ref for the canvas element
        const chartRef = useRef(null);
        const chartInstanceRef = useRef(null);

        useEffect(() => {
            const ctx = chartRef.current.getContext("2d");

            // Destroy previous chart instance if it exists
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            chartInstanceRef.current = new Chart(ctx, {
                type: "bar",
                data: {
                    labels,
                    datasets: [{
                        label: "قیمت (تومان)",
                        data: prices,
                        backgroundColor: "rgba(79, 70, 229, 0.7)"
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: "مقایسه قیمت"
                        }
                    }
                }
            });

            return () => {
                if (chartInstanceRef.current) {
                    chartInstanceRef.current.destroy();
                }
            };
        }, [compareList]); // Re-run effect when compareList changes

        return (
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">نمودار مقایسه</h3>
                <canvas id="comparisonChart" ref={chartRef} width="400" height="200"></canvas>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <span className="text-xl text-indigo-600 animate-pulse">بارگیری...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50">
                <div className="text-red-600 text-center">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                        تلاش مجدد
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* عنوان */}
                <h1 className="text-3xl font-bold text-center text-gray-800">قیمت لحظه‌ای بازار</h1>

                {/* فیلتر و جستجو */}
                <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-md">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="px-4 py-2 border rounded"
                    >
                        <option value="all">همه</option>
                        <option value="gold">طلای ایرانی</option>
                        <option value="currency">ارزهای خارجی</option>
                        <option value="crypto">رمزارزها</option>
                    </select>

                    <input
                        type="text"
                        placeholder="جستجو..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 border rounded"
                    />
                </div>

                {/* لیست */}
                {selectedItem ? (
                    <DetailsCard item={selectedItem} onClose={() => setSelectedItem(null)} />
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item, index) => (
                                    <ListItem key={index} item={item} onSelect={showDetails} onCompare={toggleCompare} />
                                ))
                            ) : (
                                <p className="col-span-full text-center text-gray-500">موردی یافت نشد.</p>
                            )}
                        </div>

                        {/* مقایسه */}
                        {compareList.length >= 2 && renderComparisonChart()}
                    </>
                )}

                {/* فوتر */}
                <div className="text-center text-sm text-gray-400 mt-6">
                    <p>منبع: brsapi.ir</p>
                    <p className="mt-1">آخرین به‌روزرسانی: {data.gold[0]?.date} - {data.gold[0]?.time}</p>
                </div>
            </div>
        </div>
    );
}

// کارت هر واحد
function ListItem({ item, onSelect, onCompare }) {
    const isPositive = parseFloat(item.change_percent) >= 0;

    return (
        <div className="bg-white rounded-xl shadow-md p-4 transition-transform duration-300 hover:scale-105">
            <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
            <p className="text-xl font-bold text-gray-900 mt-1">
                {typeof item.price === "string" ? item.price : item.price.toLocaleString()}
                {" "}
                {item.unit}
            </p>
            <div className={`mt-2 text-sm ${isPositive ? "text-green-600" : "text-red-600"} font-medium`}>
                {isPositive ? "↑ +" : "↓ "}
                {Math.abs(parseFloat(item.change_percent)).toFixed(2)}%
            </div>
            <div className="mt-3 flex justify-between">
                <button onClick={() => onSelect(item)} className="text-indigo-600 hover:underline">جزئیات</button>
                <button onClick={() => onCompare(item)} className="text-gray-500 hover:text-indigo-600">
                    {item.comparing ? "حذف" : "مقایسه"}
                </button>
            </div>
        </div>
    );
}

// صفحه جزئیات
function DetailsCard({ item, onClose }) {
    const isPositive = parseFloat(item.change_percent) >= 0;

    return (
        <div className="fixed inset-0 bg-[#2225] bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">×</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{item.name}</h2>
                <p className="text-xl font-bold text-gray-900">{item.price} {item.unit}</p>
                <div className={`mt-2 text-sm ${isPositive ? "text-green-600" : "text-red-600"} font-medium`}>
                    {isPositive ? "↑ +" : "↓ "} {Math.abs(parseFloat(item.change_percent)).toFixed(2)}%
                </div>
                <p className="mt-4 text-sm text-gray-500">تاریخ: {item.date} - {item.time}</p>
                {item.description && <p className="mt-4 text-gray-600">{item.description}</p>}
            </div>
        </div>
    );
}
