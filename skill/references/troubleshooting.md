# Troubleshooting

## Common Issues

| Issue | Resolution |
|-------|------------|
| Server not running | Execute `npx agent-aware-server start` |
| SDK not initialized | Verify `initAgentAware()` is called in entry file |
| No data collected | Ensure page was tested in browser with DevTools network tab open |

---

## FAQ

**Q: How do I determine the project root directory?**
A: The directory containing `package.json`. The monitoring script looks for `.agent-aware/alert/` relative to this path.

**Q: What happens when both alert files exist?**
A: `error.json` is prioritized (runtime errors are more severe than behavior issues).

**Q: Which entry file should I modify?**
A: Depends on the framework:
- React/Vite: `main.tsx`
- Vue: `main.ts`
- Next.js: `app/layout.tsx` (requires `useEffect`)
