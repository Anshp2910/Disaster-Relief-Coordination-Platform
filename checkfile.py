path = 'client/src/pages/RequestDetail.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix #7 handleFileUpload: move fileRef.clear to success branch (finally block)
# Check if we have the wrong structure (value clear in finally)
target_wrong = "finally {\n    setUploading(false)\n    if (fileRef.current) fileRef.current.value = ''\n  }\n}"
target_right = "finally {\n    setUploading(false)\n  }\n}\n}"

print(("wrong finally ordering" if target_wrong in content else "right finally ordering"))

# Find handleFileUpload area
start = content.find('async function handleFileUpload(')
end = content.find('\nasync function handleDeleteFile', start)
print('\nhandleFileUpload region:')
print(repr(content[start:start+400]))
