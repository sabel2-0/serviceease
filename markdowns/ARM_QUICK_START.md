# Association Rule Mining - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Python Dependencies
```bash
pip install pandas mlxtend mysql-connector-python
```

### Step 2: Generate Test Data
```bash
cd server
node scripts/populate_arm_test_data.js
```
✅ Creates 200 service requests with realistic part usage patterns

### Step 3: Start Server
```bash
node index.js
```
✅ Server starts at http://localhost:3000

### Step 4: Test in UI
1. Login as technician
2. Click any service request
3. Expand "Service Insights" section (AI badge)
4. View part recommendations!

---

## 🎯 What It Does

**Predicts which parts technicians need** based on:
- Printer model history
- Common part combinations  
- Service request patterns

**Goal**: Reduce repeat trips by recommending right parts upfront

---

## 📊 How to Read Recommendations

### Example Display:
```
1. IF Canon Separation Pad → THEN Canon Feed Roller
   ✅ 100% confidence | 🚀 1.57× likely
```

**Means**: 
- When you use Separation Pad on this Canon model
- You'll also need Feed Roller 100% of the time
- These parts occur together 57% more than random

### Confidence Levels:
- 🟢 **80%+**: Highly reliable - definitely bring this part
- 🟡 **60-79%**: Moderately reliable - probably bring it
- 🔵 **40-59%**: Somewhat reliable - consider bringing it

---

## 🔧 Testing ARM Analysis

### Test Specific Printer:
```bash
python scripts/association_rule_mining.py analyze_printer "Brother" "HL-L2350DW" 0.08 0.4
```

### Test All Printers:
```bash
python scripts/association_rule_mining.py analyze_all 0.08 0.4
```

### Parameters:
- **min_support** (0.08): Part must appear in 8% of requests
- **min_confidence** (0.4): Rule must be true 40% of the time

Lower thresholds = more rules but less reliable  
Higher thresholds = fewer rules but more reliable

---

## 🐛 Common Issues

### "Insufficient data" Error
**Solution**: Lower thresholds or generate more test data
```bash
python scripts/association_rule_mining.py analyze_printer "HP" "LaserJet Pro M404n" 0.05 0.3
```

### Python Module Not Found
**Solution**: Install dependencies
```bash
pip install pandas mlxtend mysql-connector-python
```

### No Recommendations in UI
**Causes**:
1. Printer model has <10 completed service requests
2. Thresholds too high
3. Cache needs refreshing (wait 24h or clear cache)

**Fix**: Generate more test data or adjust thresholds in code

---

## 📈 API Endpoints

### Analyze Printer
```bash
POST /api/arm/analyze
{
  "printer_brand": "HP",
  "printer_model": "LaserJet Pro M404n",
  "min_support": 0.1,
  "min_confidence": 0.5
}
```

### Get Recommendations
```bash
GET /api/arm/recommendations/19
# (where 19 is inventory_item_id)
```

### View Statistics
```bash
GET /api/arm/statistics
```

---

## 💡 Pro Tips

1. **Run analysis nightly**: Cache results for fast UI performance
   ```bash
   python scripts/association_rule_mining.py analyze_all 0.08 0.4
   ```

2. **Adjust per printer**: Popular models → higher thresholds, Rare models → lower thresholds

3. **Monitor accuracy**: Track if recommendations match actual parts used

4. **Increase test data**: More data = better predictions
   ```javascript
   // In populate_arm_test_data.js, change:
   const numRequests = 500; // Instead of 200
   ```

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `server/scripts/association_rule_mining.py` | Python ARM engine |
| `server/routes/arm.js` | Node.js API endpoints |
| `client/src/pages/technician/requests.js` | UI integration |
| `server/scripts/populate_arm_test_data.js` | Test data generator |

---

## ✅ Verification Checklist

- [ ] Python dependencies installed
- [ ] Test data populated (200+ requests)
- [ ] Server running without errors
- [ ] UI shows "Service Insights" section
- [ ] Clicking section loads recommendations
- [ ] At least 3 printer models have recommendations

---

## 🎓 Understanding the Results

### Sample Output:
```json
{
  "success": true,
  "total_transactions": 14,
  "rules": [
    {
      "antecedents": ["HP Pickup Roller"],
      "consequents": ["HP Toner CF259A"],
      "confidence": 0.86,
      "lift": 1.52
    }
  ]
}
```

**Translation**:
- 14 similar service requests analyzed
- 86% of the time, Pickup Roller + Toner are used together
- 52% more likely than random chance

---

## 🔄 Workflow

1. **Technician gets request** → Opens service request
2. **Views printer model** → HP LaserJet Pro M404n
3. **Checks Service Insights** → Sees recommendations
4. **Brings suggested parts** → Pickup Roller + Toner
5. **Completes service** → No return trip needed! ✅

---

## 📞 Need Help?

- **Documentation**: `ASSOCIATION_RULE_MINING_IMPLEMENTATION.md`
- **Issues**: Check troubleshooting section
- **Questions**: Contact development team

---

**Status**: ✅ **FULLY IMPLEMENTED & TESTED**

**Last Updated**: October 20, 2025
