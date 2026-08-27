# បញ្ជីជំពាក់ ចាប់ហួយ — Supabase + GitHub

## 1) Supabase
1. បង្កើត Project នៅ Supabase។
2. ចូល SQL Editor → បើក `supabase.sql` → Run ទាំងអស់។
3. ចូល Authentication → Users → បង្កើត Email/Password account។
4. ចូល Project Settings → API ហើយយក Project URL និង Publishable/Anon key។

## 2) ដាក់ Key
បើក `config.js` ហើយប្ដូរ:
- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

កុំដាក់ `service_role` key ក្នុង frontend/GitHub។

## 3) GitHub Pages
Upload files ទាំងនេះទៅ GitHub repository:
- index.html
- style.css
- app.js
- config.js
- supabase.sql
- README.md

បន្ទាប់មក Settings → Pages → Deploy from branch → main → /root។

## មុខងារ
- អ្នកជំពាក់ថ្មី
- បន្ថែមការជំពាក់រាល់លើក
- មុខទំនិញ + ចំនួនលុយរៀល (៛) + ថ្ងៃ
- កត់ត្រាការសង
- គណនាសរុបជំពាក់ / បានសង / នៅសល់
- ប្រវត្តិការជំពាក់ និងការសង
- ស្វែងរក
- កែ/លុប
- Login Supabase
- Responsive សម្រាប់ទូរស័ព្ទ
