Investigate why the gccli skill isn't discoverable despite the Dockerfile cloning pi-skills, and fix the report location issue. Specifically:

1. Check the current Pi skills setup - look at what's in /pi-skills and how Pi discovers skills
2. Examine the .pi/skills/ directory and see if it's properly linked to /pi-skills
3. Test Pi's skill discovery mechanism - run `pi --list-skills` or equivalent to see what skills are actually discovered
4. Check if there's a configuration issue preventing gccli from being found
5. Investigate why the previous report ended up in /tmp instead of being committed to the repo
6. Save this investigation report to logs/364c0f99-195f-4c8c-8898-3191da223d3c/gccli-skill-discovery-analysis.md so it's properly committed
7. If the skill should be discoverable but isn't, identify what needs to be fixed

The goal is to understand the actual skill discovery mechanism and why gccli isn't being found despite being in the cloned pi-skills repo.