// ========= 7-point rolling mean on a Danfo Series =========
function rollingMeanSeries(series, windowSize = 7) {
    const values = series.values;
    const out = [];

    for (let i = 0; i < values.length; i++) {
        if (i < windowSize - 1) {
            out.push(null); // not enough points yet
        } else {
            let sum = 0;
            let count = 0;
            for (let j = i - windowSize + 1; j <= i; j++) {
                const v = values[j];
                if (!isNaN(v)) {
                    sum += v;
                    count++;
                }
            }
            out.push(count > 0 ? sum / count : null);
        }
    }
    return out;
}

// ====== Global storage for full datasets (unfiltered) ======
let fullWeightLabels   = [];
let fullWeightValues   = [];
let fullWeightRolling7 = [];

let fullNutriLabels    = [];
let fullBreakfast      = [];
let fullLunch          = [];
let fullDinner         = [];
let fullSnacks         = [];

let currentRange = "all"; // "all" | "30" | "15"

// Apply currentRange to both charts
function applyGlobalFilter(weightChart, nutritionChart) {
    const mode = currentRange;

    // --- Weight chart ---
    if (fullWeightLabels.length > 0) {
        let startIndex = 0;
        if (mode === "30") {
            startIndex = Math.max(0, fullWeightLabels.length - 30);
        } else if (mode === "15") {
            startIndex = Math.max(0, fullWeightLabels.length - 15);
        }

        const labels = fullWeightLabels.slice(startIndex);
        const values = fullWeightValues.slice(startIndex);
        const rolling = fullWeightRolling7.slice(startIndex);

        weightChart.data.labels = labels;
        weightChart.data.datasets[0].data = values;
        weightChart.data.datasets[1].data = rolling;
        weightChart.update();
    }

    // --- Nutrition chart ---
    if (fullNutriLabels.length > 0) {
        let startIndex = 0;
        if (mode === "30") {
            startIndex = Math.max(0, fullNutriLabels.length - 30);
        } else if (mode === "15") {
            startIndex = Math.max(0, fullNutriLabels.length - 15);
        }

        const labels = fullNutriLabels.slice(startIndex);

        nutritionChart.data.labels = labels;
        nutritionChart.data.datasets[0].data = fullBreakfast.slice(startIndex);
        nutritionChart.data.datasets[1].data = fullLunch.slice(startIndex);
        nutritionChart.data.datasets[2].data = fullDinner.slice(startIndex);
        nutritionChart.data.datasets[3].data = fullSnacks.slice(startIndex);

        nutritionChart.update();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // ======================= CHART 1: WEIGHT =======================
    const weightCtx = document.getElementById("weightChart");

    const weightChart = new Chart(weightCtx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Weight",
                    data: [],
                    borderWidth: 2,
                    tension: 0.2
                },
                {
                    label: "7-Day Rolling Avg",
                    data: [],
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: "Date" } },
                y: { title: { display: true, text: "Weight" } }
            }
        }
    });

    // ======================= CHART 2: NUTRITION =======================
    const nutritionCtx = document.getElementById("nutritionChart");

    const nutritionChart = new Chart(nutritionCtx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [
                { label: "Breakfast", data: [], backgroundColor: "rgba(255, 159, 64, 0.7)" },
                { label: "Lunch",     data: [], backgroundColor: "rgba(54, 162, 235, 0.7)" },
                { label: "Dinner",    data: [], backgroundColor: "rgba(75, 192, 192, 0.7)" },
                { label: "Snacks",    data: [], backgroundColor: "rgba(153, 102, 255, 0.7)" }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, title: { display: true, text: "Date" } },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: "Calories" } }
            }
        }
    });

    // ======================= ELEMENTS =======================
    const weightInput  = document.getElementById("weightFileInput");
    const nutritionInput = document.getElementById("nutritionFileInput");

    const uploadWeight        = document.getElementById("uploadWeight");
    const uploadWeightLabel   = document.getElementById("uploadWeightBtn");

    const uploadNutrition     = document.getElementById("uploadNutrition");
    const uploadNutritionLabel= document.getElementById("uploadNutritionBtn");

    const rangeSelect         = document.getElementById("rangeFilter");

    // Open hidden file pickers
    uploadWeight.addEventListener("click", () => weightInput.click());
    uploadNutrition.addEventListener("click", () => nutritionInput.click());

    // Global range filter change
    rangeSelect.addEventListener("change", () => {
        currentRange = rangeSelect.value; // "all", "30", "15"
        applyGlobalFilter(weightChart, nutritionChart);
    });

    // ======================= WEIGHT CSV HANDLER =======================
    // expects: Date,Weight as first two columns
    weightInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        uploadWeightLabel.textContent = "Uploaded: " + file.name;
        uploadWeightLabel.style.display = "inline-block";

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);

            const dates = [];
            const weights = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(",");
                if (parts.length < 2) continue;

                const dateStr   = parts[0].trim();
                const weightVal = parseFloat(parts[1]);

                if (!dateStr || isNaN(weightVal)) continue;

                dates.push(dateStr);
                weights.push(weightVal);
            }

            if (dates.length === 0) return;

            const df = new dfd.DataFrame({ Date: dates, Weight: weights });
            const dfSorted = df.sortValues("Date");

            fullWeightLabels   = dfSorted["Date"].values;
            fullWeightValues   = dfSorted["Weight"].values;
            fullWeightRolling7 = rollingMeanSeries(dfSorted["Weight"], 7);

            // Apply whatever filter is currently selected
            applyGlobalFilter(weightChart, nutritionChart);
        };

        reader.readAsText(file);
    });

    // ======================= NUTRITION CSV HANDLER =======================
    // expects: Date, Meal, Calories, ...
    nutritionInput.addEventListener("change", function () {
        const file = this.files[0];
        if (!file) return;

        uploadNutritionLabel.textContent = "Uploaded: " + file.name;
        uploadNutritionLabel.style.display = "inline-block";

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);

            if (lines.length < 2) return;

            const byDate = {};  // { [date]: {Breakfast, Lunch, Dinner, Snacks} }

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const parts = line.split(",");
                if (parts.length < 3) continue;

                const dateStr = parts[0].trim();
                const mealStr = parts[1].trim();
                const calVal  = parseFloat(parts[2]);

                if (!dateStr || !mealStr || isNaN(calVal)) continue;

                if (!byDate[dateStr]) {
                    byDate[dateStr] = { Breakfast: 0, Lunch: 0, Dinner: 0, Snacks: 0 };
                }

                const mealLower = mealStr.toLowerCase();

                if (mealLower.includes("breakfast")) {
                    byDate[dateStr].Breakfast += calVal;
                } else if (mealLower.includes("lunch")) {
                    byDate[dateStr].Lunch += calVal;
                } else if (mealLower.includes("dinner")) {
                    byDate[dateStr].Dinner += calVal;
                } else if (mealLower.includes("snack")) {
                    byDate[dateStr].Snacks += calVal;
                }
            }

            const sortedDates = Object.keys(byDate).sort();

            fullNutriLabels = sortedDates;
            fullBreakfast   = [];
            fullLunch       = [];
            fullDinner      = [];
            fullSnacks      = [];

            for (const d of sortedDates) {
                const day = byDate[d];
                fullBreakfast.push(day.Breakfast);
                fullLunch.push(day.Lunch);
                fullDinner.push(day.Dinner);
                fullSnacks.push(day.Snacks);
            }

            // Apply current filter
            applyGlobalFilter(weightChart, nutritionChart);
        };

        reader.readAsText(file);
    });
});



