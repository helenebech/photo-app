JWT="$1"; IMG="$2"; PAR=${3:-8}; DUR=${4:-300}
URL="http://localhost:3000/api/v1/images/$IMG/process"
end=$((SECONDS+DUR))
while [ $SECONDS -lt $end ]; do
seq 1 $PAR | xargs -n1 -P $PAR -I{} curl -s -X POST -H "Authorization: Bearer $JWT" "$URL" > /dev/null
sleep 0.5
done